from fastapi import *
from datetime import datetime,timedelta,timezone
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.responses import HTMLResponse, RedirectResponse
from typing import Optional, Union
import mysql.connector
import json
import os
from fastapi.staticfiles import StaticFiles
import jwt
import re
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests
from fastapi import FastAPI, File, UploadFile
import boto3
from botocore.exceptions import NoCredentialsError


app=FastAPI(debug=True)
jwtkey = "iweorhfnen834"

# 從環境變數中讀取 MySQL 密碼
mysql_password = os.environ.get("MYSQL_PASSWORD")
tappay_partner_key = os.environ.get("TAPPAY")

# 設置 AWS S3 環境變數
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
AWS_BUCKET_NAME = "project-july.com"
AWS_REGION = "ap-southeast-2"  # 例如 'us-east-1'

s3_client = boto3.client(
	's3', 
	region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY)

# 連接到 MySQL 資料庫
with mysql.connector.connect(
    host="rds-mysql-8.c1yokekwm2p0.ap-southeast-2.rds.amazonaws.com",
    user="admin",
    password=mysql_password,
    database="website",
	pool_name="hello"
    ):pass

# 設定靜態檔案路徑
app.mount("/static", StaticFiles(directory="static"), name="static")

# 創建一個 HTTPBearer 的實例
security = HTTPBearer()

# To get JWT token and decode JWT token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, jwtkey, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Signature has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
	return FileResponse("./static/attraction.html", media_type="text/html")
@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
	return FileResponse("./static/booking.html", media_type="text/html")
@app.get("/home", include_in_schema=False)
async def home(request: Request):
	return FileResponse("./static/home.html", media_type="text/html")
@app.get("/feed", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/feed.html", media_type="text/html")

@app.get("/countries.json", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/countries.json", media_type="application/json")


@app.get("/painting", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/painting.html", media_type="text/html")


# 新增明信片
@app.post("/api/postcards", response_class=JSONResponse)
async def add_postcards(request: Request):

	# 從 Authorization Header 中提取 token
	auth_header = request.headers.get('Authorization')
	if auth_header:
		myjwt = auth_header.split(" ")[1] 

		# 解碼 JWT
		myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")

		print("print myjwtx:", myjwtx)

		# 解析請求的 JSON 資料
		data = await request.json()

		print("Print Received data:", data)

		# 將資料存到 POSTCARDS DB
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
			query = """
				INSERT INTO postcards (mailFrom, country, message)
				VALUES (%s, %s, %s)
				"""
			mycursor.execute(query, (myjwtx["name"], myjwtx["country"], data["message"],))
			mydb.commit()
			
			return JSONResponse(status_code=200, content={
					"name": myjwtx["name"], 
					"country": myjwtx["country"], 
					"message": data["message"]})



# 登入會員資訊
@app.get("/api/user/auth", response_class=JSONResponse)
async def signin(request: Request):

	# 從 Authorization Header 中提取 token
	auth_header = request.headers.get('Authorization')
	if auth_header:
		myjwt = auth_header.split(" ")[1] 
		try:
			myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")
			# print(myjwtx)
			return {
				"data" : {
					"id": myjwtx["id"],
					"name" : myjwtx["name"] ,
					"email" : myjwtx["email"]
				}
			}

		except jwt.ExpiredSignatureError:
			print("expired")
			return JSONResponse(status_code=401, content={
				"data": None
				}) 

		except Exception as e:
			print("other exception")
			return JSONResponse(status_code=401, content={
				"data": None
				}) 



# 登入會員
@app.put("/api/user/auth", response_class=JSONResponse)
async def signin(request: Request, data:dict):
	#print (data)
	with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
		query = """
			SELECT id, name, username as email, country
			FROM postcard_users 
			WHERE username = %s AND password = %s
			"""
		mycursor.execute(query, (data["email"], data["password"],))
		results = mycursor.fetchall()
		

		if results :
			exp = datetime.now(tz=timezone.utc) + timedelta(days=7)
			results[0].update({"exp": exp})
			access_token = jwt.encode(results[0], jwtkey, algorithm="HS256")
			resp = JSONResponse(status_code=200, content={
				"token": access_token
				})
			# resp.set_cookie(key='myjwt',value=access_token, expires=exp)
			return resp
		
		else :
			#return {"data":None}

			resp = JSONResponse(status_code=401, content={
				"data": None,
				#"error": True,
				#"message": "系統錯誤"
				})
			# resp.delete_cookie("myjwt")
			return resp 

		

# 註冊
@app.post("/api/user", response_class=JSONResponse)
async def register(request: Request, data:dict):
	try:
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
			query = """
				SELECT id, name, username as email
				FROM postcard_users 
				WHERE username = %s
				"""
			mycursor.execute(query, (data["email"],))
			results = mycursor.fetchall()
			

			if results :
				return JSONResponse(status_code=400, content={
					"error": True,
					"message": "信箱重複註冊"})

			else :
				query = """
				INSERT INTO postcard_users (name, username, password, country)
				VALUES (%s, %s, %s, %s)
				"""
				mycursor.execute(query, (data["name"],data["email"],data["password"],data["country"],))
				mydb.commit()
				return {
					"ok": True
					}

	except Exception as e:
		return JSONResponse(status_code=500, content={
				"error": True,
				"message": e
				}) 


@app.post("/api/createMessage", response_class=JSONResponse)
async def createMessage(request: Request, say: Optional[str] = Form(None), img_upload: Optional[UploadFile] = File(None)):  # 參數是 submit Form 的 name
	# 從 Authorization Header 中提取 token
	auth_header = request.headers.get('Authorization')
	if not auth_header:
		return RedirectResponse(url="/home", status_code=status.HTTP_303_SEE_OTHER)

	else:
		myjwt = auth_header.split(" ")[1] 

		# 解碼 JWT
		myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")

		
		img_link = None
		if img_upload.filename:
			# 產生唯一的文件名
			unique_name = f"{datetime.now()}_{img_upload.filename}"
			# 設置 S3 key
			s3_key = f"{unique_name}"
			s3_client.upload_fileobj(img_upload.file, AWS_BUCKET_NAME, s3_key)
			img_link = f"https://d3637x49yyjgf.cloudfront.net/{s3_key}"
			# img_link = f"https://s3.{AWS_REGION}.amazonaws.com/{AWS_BUCKET_NAME}/{s3_key}"


		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
			query = "INSERT INTO message (member_id, content, img_link) VALUES (%s, %s, %s)"
			inputs = (myjwtx['id'], say, img_link)
			mycursor.execute(query, inputs)

			# 提交事務
			mydb.commit()

		return RedirectResponse(url="/feed", status_code=status.HTTP_303_SEE_OTHER)


@app.get("/api/feed", response_class=JSONResponse)
async def feed(request: Request):
	# 檢查使用者是否已登入
	# 從 Authorization Header 中提取 token
	auth_header = request.headers.get('Authorization')
	if not auth_header:
		return JSONResponse(status_code=403, content={
			"error": True,
			"message": "未登入系統，拒絕存取"
			})

	else:
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
			query = """
			WITH board AS(
				SELECT postcard_users.name, message.content, img_link, message.time, message.id, parent_id, LPAD(ifnull(parent_id,message.id), 3, '0') AS level
				FROM message 
				JOIN postcard_users ON message.member_id = postcard_users.id 
			)
			SELECT * FROM board 
			ORDER BY level,id
			"""
			mycursor.execute(query)
			result = mycursor.fetchall()
			# print(result)

			# 如果是回覆留言，則HTML要多一層ul
			px=None
			UL2=None
			for x in result:
				if not px:
					pass
				else:
					if not UL2 and px['level']==x['level']:
						x['addUL']=True
						UL2=True
					if UL2 and px['level']!=x['level']:
						px['delUL']=True
						UL2=None

				px=x

		return {
				"data": {
					"show_msgboard":result
					}
				}
