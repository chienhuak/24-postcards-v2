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
# 用 Python 管理 AWS 資源 (例如：S3)
import boto3
from botocore.exceptions import NoCredentialsError
# 隨機
import random
from typing import List  # 資料型別提示
# enable CORS on server 
from fastapi.middleware.cors import CORSMiddleware


app=FastAPI(debug=True)
jwtkey = "iweorhfnen834"

# 從環境變數中讀取 MySQL 密碼
mysql_password = os.environ.get("MYSQL_PASSWORD")
tappay_partner_key = os.environ.get("TAPPAY")

# CORS config
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# WebSocket
class ConnectionManager:
	def __init__(self):
		self.active_connections: List[WebSocket] = [] # 追蹤哪些客戶端是連線的

	async def connect(self, websocket: WebSocket):
		print("WS已連線")
		await websocket.accept() # 當有新的WebSocket連線請求時調用connect(), 接受連線請求，並建立通信通道
		self.active_connections.append(websocket) # 將新的WebSocket連線加到清單

	def disconnect(self, websocket: WebSocket):
		print("WS中斷連線")
		self.active_connections.remove(websocket) # 將斷開的WebSocket連線從清單中移除

	async def broadcast(self, message: str): # 向所有連線的WebSocket客戶端廣播訊息
		print("WS廣播 to ", self.active_connections)
		for connection in self.active_connections:
			print("WS廣播狀態 ...", connection.application_state)
			try :
				await connection.send_text(message)
			except WebSocketDisconnect :
				manager.disconnect(connection)
			except Exception as e :
				print("WS廣播失敗",e)


manager = ConnectionManager()


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


@app.get("/home", include_in_schema=False)
async def home(request: Request):
	return FileResponse("./static/earth3d.html", media_type="text/html")

@app.get("/feed", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/feed.html", media_type="text/html")

@app.get("/collections", include_in_schema=False)
async def collections(request: Request):
	return FileResponse("./static/collections.html", media_type="text/html")

@app.get("/painting", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/painting.html", media_type="text/html")

@app.get("/history", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/home.html", media_type="text/html")

@app.get("/mystamps", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/stamp.html", media_type="text/html")

@app.get("/mydrafts", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/draft.html", media_type="text/html")

@app.get("/about", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/about.html", media_type="text/html")


# 我的郵票成就
@app.get("/api/stamps", response_class=JSONResponse)
async def stamps(request: Request):

	auth_header = request.headers.get('Authorization')
	if auth_header:
		myjwt = auth_header.split(" ")[1] 
		myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")

	with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :

		queryAll = """
		SELECT *
		FROM stamps 
		"""
		mycursor.execute(queryAll)
		result1 = mycursor.fetchall()
		# print("所有郵票清單：",result1)

		queryUnlock = """
		SELECT s.stamp_id, s.image_url
		FROM stamps s
		LEFT JOIN user_stamp us on s.stamp_id = us.stamp_id 
		WHERE s.unlock_value='free' OR us.user_id = %s
		"""
		mycursor.execute(queryUnlock,(myjwtx["id"],))
		result2 = mycursor.fetchall()
		# print("解鎖成就：",result2)
		unlocked_stamp_id = {stamp["stamp_id"] for stamp in result2}

		for stamp in result1:
			if stamp["stamp_id"] not in unlocked_stamp_id:
				stamp["image_url"] = "/static/image/lock-icon-2.png"

	return {
		"all": result1,
		"unlock": result2,
		}


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

		# 將資料存到資料庫
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :

			# 寫入 POSTCARDS
			query = """
				INSERT INTO postcards (mailFrom, country, message, latitude, longitude, image)
				VALUES (%s, %s, %s, %s, %s, %s)
				"""
			mycursor.execute(query, (myjwtx["name"], myjwtx["country"], data["message"], data["latitude"], data["longitude"], data["imglink"],))

			# 獲取最後插入資料自動產生的 ID
			postcard_id = mycursor.lastrowid

			# 寫入 POSTCARD_QUEUE ( 怎麼拿到POSTCARD_ID ?)
			query2 = """
				INSERT INTO postcard_queue (postcardID, mailFrom, country)
				VALUES (%s, %s, %s)
				"""
			mycursor.execute(query2, (postcard_id, myjwtx["name"], myjwtx["country"],))

			# 解鎖持續寄信郵票
			nonstop_stamp_unlock(mycursor, myjwtx["id"])

			mydb.commit()
			
			await broadcast_queue_update([{'postcardID':postcard_id,'mailFrom':myjwtx["name"]}], 'add')

			return JSONResponse(status_code=200, content={
					"name": myjwtx["name"], 
					"country": myjwtx["country"], 
					"message": data["message"],
					"latitude": data["latitude"],
					"longitude": data["longitude"]})


# 解鎖持續寄信郵票
def nonstop_stamp_unlock(cursor : mysql.connector.cursor.MySQLCursorDict, userID : int) : 

	# criteria
	query5 = """
		SELECT stamp_id, unlock_value
		FROM stamps
		WHERE cat = "nonstop"
		"""
	cursor.execute(query5)
	criteriaList = cursor.fetchall()  # [{stamp_id:8,unlock_value:5},{stamp_id:9,unlock_value:20},{stamp_id:10,unlock_value:100}]
	print("類別二解鎖條件:",criteriaList)

	# 查詢寄件總數
	query6 = """
		SELECT count(p.mailFrom)
		FROM postcards p
		INNER JOIN postcard_users u on u.name = p.mailFrom
		WHERE u.id = %s
		GROUP BY mailFrom
		"""
	cursor.execute(query6, (userID,))
	result6 = cursor.fetchone()  # 27
	sentCount = int(result6['count(p.mailFrom)']) if result6 else 0  # 如果沒有寄信紀錄，設為 0
	print("寄信總數:",sentCount)

	# 查詢最新一筆解鎖紀錄
	query7 = """
		SELECT s.unlock_value
		FROM user_stamp us
		INNER JOIN stamps s on s.stamp_id = us.stamp_id
		WHERE s.cat = "nonstop" AND us.user_id = %s
		ORDER BY s.unlock_value ASC
		LIMIT 1
		"""
	cursor.execute(query7, (userID,))
	result7 = cursor.fetchone() # 20 OR None
	reachUnlockValue = int(result7['unlock_value']) if result7 else 0  # 如果沒有解鎖紀錄，預設為 0
	print("解鎖紀錄最大值:",reachUnlockValue)

	# 判斷是否應該解鎖新的成就
	for criteria in criteriaList :
		stamp_id = criteria['stamp_id']
		unlock_value = int(criteria['unlock_value'])

		# 如果寄件總數達到了新的標準，且未解鎖該成就
		if sentCount >= unlock_value and unlock_value > reachUnlockValue :
			# 解鎖該成就，插入 user_stamp 表
			query8 = """
				INSERT INTO user_stamp (user_id, stamp_id)
				VALUES (%s, %s)
			"""
			cursor.execute(query8, (userID, stamp_id))
			


# 解鎖地區郵票
def region_stamp_unlock(cursor : mysql.connector.cursor.MySQLCursorDict, postcardID : int) : 

	query5 = """
		SELECT t.id as receiverUid, f.region
		FROM postcards p
		INNER JOIN postcard_users f on f.name = p.mailFrom
		INNER JOIN postcard_users t on t.name = p.mailTo
		WHERE postcardID = %s
		"""
	cursor.execute(query5, (postcardID,))
	user = cursor.fetchall()

	query6 = """
		SELECT s.stamp_id
		FROM user_stamp us
		INNER JOIN stamps s on s.stamp_id = us.stamp_id
		WHERE us.user_id = %s and s.unlock_value=%s
		LIMIT 1
		"""
	cursor.execute(query6, (user[0]['receiverUid'],user[0]['region']))
	hasStamp = cursor.fetchall()

	query7 = """
		INSERT INTO user_stamp (user_id, stamp_id)
		select %s, stamp_id from stamps where unlock_value = %s
		"""
	if not hasStamp :
		cursor.execute(query7, (user[0]['receiverUid'],user[0]['region']))


# 隨機配對，然後將配對結果回填到資料庫
@app.get("/api/matching", response_class=JSONResponse)
async def random_matching(request: Request):
	#print (data)
	with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
		query = """
			SELECT postcardID, mailFrom, country
			FROM postcard_queue 
			"""
		mycursor.execute(query, )
		results = mycursor.fetchall()
		

		# 淺拷貝。這樣我們可以在不改變原始資料的情況下進行配對操作
		unpaired_data = results[:]
		# 隨機打亂資料順序
		random.shuffle(unpaired_data)


		# 存儲配對結果
		pairs = []

		# 存儲未配對資料
		unpaired_leftovers = []


		# while 循環會持續執行，直到 unpaired_data 中的所有資料都被處理完
		while unpaired_data:
			# pop(0) 將列表的第一個元素取出並從列表中刪除，這樣 unpaired_data 會隨著每次循環減少一個元素
			current = unpaired_data.pop(0)
			paired = None

			# 查找配對對象
			for i in range(len(unpaired_data)):
				candidate = unpaired_data[i]
				print(f"step 1 {candidate}")  
				if candidate['mailFrom'] != current['mailFrom']:
					paired = candidate
					print(f"step 2: Found pair {paired}")  # Debugging: 顯示找到的配對對象
					unpaired_data.pop(i)
					print(f"step 3: Remaining data {unpaired_data}")  # Debugging: 顯示剩餘的未配對數據  
					break

			# 如果找到配對，將其添加到配對結果中
			if paired:
				pairs.append((current['postcardID'], paired['postcardID']))
				print(f"step 4: Current pairs {pairs}")  # Debugging: 顯示當前配對結果

			else:
				# 如果沒有找到配對，將 current 加入未配對列表
				unpaired_leftovers.append(current)

		# print(f"無法配對：{unpaired_leftovers}")
		# print(f"已配對：{pairs}")

		broadcast_del_list = []

		for i in pairs :
			query1 = """
				UPDATE postcards a
				inner join postcards b on b.postcardID = %s
				SET a.mailTo = b.mailFrom
				WHERE a.postcardID = %s
				"""
			query2 = """
				UPDATE postcards a
				inner join postcards b on b.postcardID = %s
				SET a.mailTo = b.mailFrom
				WHERE a.postcardID = %s
				"""
			query3 = """
				DELETE FROM postcard_queue
				WHERE postcardID in (%s,%s)
				"""
			query4 = """
				INSERT INTO notifications (type, ref)
				VALUES ('newarrive', %s),('newarrive', %s)
				"""

			mycursor.execute(query1, (i[0],i[1]))
			mycursor.execute(query2, (i[1],i[0]))
			mycursor.execute(query3, (i[1],i[0]))
			mycursor.execute(query4, (i[1],i[0]))

			# 郵票解鎖
			region_stamp_unlock(mycursor,i[0])
			region_stamp_unlock(mycursor,i[1])	

			broadcast_del_list.append({'postcardID':i[0]})
			broadcast_del_list.append({'postcardID':i[1]})

		mydb.commit()

		await broadcast_queue_update(broadcast_del_list, 'del')

		return {
			"ok": True
			} 


# 新增明信片 : 指定收件人、寄出當下直接配送完畢 TBD
@app.post("/api/mailto", response_class=JSONResponse)
async def mailto(request: Request):

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

		# 將資料存到資料庫
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :

			# 寫入 POSTCARDS
			query = """
				INSERT INTO postcards (mailFrom, mailTo, country, message, latitude, longitude, image)
				VALUES (%s, %s, %s, %s, %s, %s, %s)
				"""
			mycursor.execute(query, (myjwtx["name"], data["mailto"], myjwtx["country"], data["message"], data["latitude"], data["longitude"], data["imglink"],))

			# 獲取最後插入資料自動產生的 ID
			postcard_id = mycursor.lastrowid

			# 寫入 notifications table
			query2 = """
				INSERT INTO notifications (type, ref)
				VALUES ('newarrive', %s)
				"""
			mycursor.execute(query2, (postcard_id,))

			# 解鎖地區郵票
			region_stamp_unlock(mycursor, postcard_id)
			# 解鎖持續寄信郵票
			nonstop_stamp_unlock(mycursor, myjwtx["id"])

			mydb.commit()

			return JSONResponse(status_code=200, content={"data": {"ok": True}})
			# return JSONResponse(status_code=200, content={
			# 		"name": myjwtx["name"], 
			# 		"country": myjwtx["country"], 
			# 		"message": data["message"],
			# 		"latitude": data["latitude"],
			# 		"longitude": data["longitude"]})
		

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
				INSERT INTO postcard_users (name, username, password, country, region)
				VALUES (%s, %s, %s, %s, %s)
				"""
				mycursor.execute(query, (data["name"],data["email"],data["password"],data["country"],data["region"],))
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
			query = "INSERT INTO postcard_msgboard (member_id, content, img_link) VALUES (%s, %s, %s)"
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
				SELECT postcard_users.name, PM.content, img_link, PM.time, PM.msg_id, parent_id, LPAD(ifnull(parent_id,PM.msg_id), 3, '0') AS level
				FROM postcard_msgboard PM
				JOIN postcard_users ON PM.member_id = postcard_users.id 
			)
			SELECT * FROM board 
			ORDER BY msg_id DESC
			"""
			# -- ORDER BY level,id 留言排序功能待更新
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


# 將編輯完畢的明信片儲存到 S3
@app.post("/api/saveCanvas", response_class=JSONResponse)
async def saveCanvas(request: Request, canvas_image: Optional[UploadFile] = File(None)):  
	# 從 Authorization Header 中提取 token
	auth_header = request.headers.get('Authorization')
	if not auth_header:
		return RedirectResponse(url="/home", status_code=status.HTTP_303_SEE_OTHER)

	else:
		myjwt = auth_header.split(" ")[1] 

		# 解碼 JWT
		myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")

		
		img_link = None
		if canvas_image.filename:
			# 產生唯一的文件名
			unique_name = f"{datetime.now()}_{canvas_image.filename}"
			# 設置 S3 key
			s3_key = f"{unique_name}"
			s3_client.upload_fileobj(canvas_image.file, AWS_BUCKET_NAME, s3_key)
			img_link = f"https://d3637x49yyjgf.cloudfront.net/{s3_key}"

		print("img_link")
		return {"message": "File uploaded successfully", "img_link": img_link}



# 我收到的明信片
@app.get("/api/collections", response_class=JSONResponse)
async def collections(request: Request, page:Optional[int]=0,keyword:Optional[str]=""):

	# 從 Authorization Header 中提取 token
	auth_header = request.headers.get('Authorization')
	if auth_header:
		myjwt = auth_header.split(" ")[1] 

		# 解碼 JWT
		myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")

	if page < 0:
		return JSONResponse(status_code=500, content={
			"error": True,
			"message": "頁數錯誤"
			}) 

	with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :

		# 每頁顯示12條留言
		page_size = 12

		query = """
		SELECT *
		FROM postcards p
		INNER JOIN postcard_users u on p.mailFrom = u.name
		WHERE (mailto = %s) 
		ORDER BY postcardid desc
		LIMIT %s OFFSET %s
		"""
		# mycursor.execute(query, (keyword, '%'+keyword+'%', page_size, page_size*page))   # 關鍵字搜尋
		mycursor.execute(query, (myjwtx["name"], page_size, page_size*page))
		results = mycursor.fetchall()

	return {
		"nextPage": page+1 if len(results) == 12 else None,
		"data": results}


# 我寄出的明信片
@app.get("/api/historymap", response_class=JSONResponse)
async def historymap(request: Request, page:Optional[int]=0,keyword:Optional[str]=""):

	# 從 Authorization Header 中提取 token
	auth_header = request.headers.get('Authorization')
	if auth_header:
		myjwt = auth_header.split(" ")[1] 

		# 解碼 JWT
		myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")

	if page < 0:
		return JSONResponse(status_code=500, content={
			"error": True,
			"message": "頁數錯誤"
			}) 

	with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :

		# 每頁顯示12條留言
		page_size = 12

		query = """
		SELECT *
		FROM postcards p
		INNER JOIN postcard_users u on p.mailFrom = u.name
		WHERE (mailFrom = %s) 
		ORDER BY postcardid desc
		LIMIT %s OFFSET %s
		"""
		# mycursor.execute(query, (keyword, '%'+keyword+'%', page_size, page_size*page))   # 關鍵字搜尋
		mycursor.execute(query, (myjwtx["name"], page_size, page_size*page))
		results = mycursor.fetchall()

	return {
		"nextPage": page+1 if len(results) == 12 else None,
		"data": results}


# 查詢玩家排名
@app.get("/api/ranking", response_class=JSONResponse)
async def ranking(request: Request):

		# 將資料存到資料庫
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :

			# 寫入 POSTCARDS
			query = """
				SELECT mailFrom, count(mailFrom) as total 
				FROM postcards
				GROUP BY mailFrom 
				ORDER BY total DESC
				"""
			mycursor.execute(query)

			results = mycursor.fetchall()
			print(results)
			
			return JSONResponse(status_code=200, content={
					"data": results })


# 未讀訊息數量
@app.get("/unread", response_class=JSONResponse)
async def unread(request: Request):
	
	# 從 Authorization Header 中提取 token
	auth_header = request.headers.get('Authorization')
	if auth_header:
		myjwt = auth_header.split(" ")[1] 

		# 解碼 JWT
		myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")
		print("目前登入：",myjwtx["name"])

		# 將資料存到資料庫
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
			query = """
				SELECT postcards.mailTo , count(postcards.mailTo) as count
				FROM notifications n
				INNER JOIN postcards ON n.ref = postcards.postcardID
				WHERE readStatus <> 'Y' and postcards.mailTo = %s
				"""
			mycursor.execute(query, (myjwtx["name"],))

			results = mycursor.fetchall()
			print("未讀數量：",results)
			
			return JSONResponse(status_code=200, content={
					"data": results })


# 更新訊息狀態為已讀
@app.put("/read", response_class=JSONResponse)
async def read(request: Request):
	try:
	
		# 從 Authorization Header 中提取 token
		auth_header = request.headers.get('Authorization')
		if auth_header:
			myjwt = auth_header.split(" ")[1] 

			# 解碼 JWT
			myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")
			print("目前登入：",myjwtx["name"])

			# 將資料存到資料庫
			with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
				query = """
					UPDATE notifications n
					INNER JOIN postcards ON n.ref = postcards.postcardID
					SET n.readStatus = 'Y'
					WHERE readStatus <> 'Y' and postcards.mailTo = %s
					"""
				mycursor.execute(query, (myjwtx["name"],))
				mydb.commit()
				print("未讀訊息已成功標記為已讀")
				
				return JSONResponse(status_code=200, content={
						"ok": True })
	except Exception as e:
		print("已讀更新錯誤:", e)
		return JSONResponse(status_code=500, content={
            "ok": False
        })
	



# 查詢歷史紀錄
@app.get("/api/history", response_class=JSONResponse)
async def history(request: Request):

	auth_header = request.headers.get('Authorization')
	if auth_header:
		myjwt = auth_header.split(" ")[1] 
		myjwtx = jwt.decode(myjwt,jwtkey,algorithms="HS256")

		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :
			query = """
				SELECT *
				FROM postcards
				WHERE mailFrom = %s
				"""
			mycursor.execute(query, (myjwtx["name"],))	
			results = mycursor.fetchall()

			for result in results:
				result['latitude'] = float(result['latitude'])
				result['longitude'] = float(result['longitude'])
				result['timecreated'] = result['timecreated'].isoformat()

			print("我的歷史資料：",results)
			
			return JSONResponse(status_code=200, content={
					"data": results })




# @app.websocket("/ws")
# async def websocket_endpoint(websocket: WebSocket):
#     await manager.connect(websocket)
#     try:
#         while True:
#             data = await websocket.receive_text()
#             await manager.broadcast(data)
#     except WebSocketDisconnect:
#         manager.disconnect(websocket)


"""
1. A 連線 -> 收到所有 queue -> 飛機動畫  (function : broadcast entire queue data)
2. 任何人寄信 (queue update) -> 動畫更新  (function : broadcast "add/delete" data)
3. 配對完畢 -> 刪除資料 -> 動畫更新 
"""

async def send_all_queue(ws: WebSocket) :
	try :
		# 資料庫
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :

			# 查詢 POSTCARDS
			query = """
				SELECT postcardID,mailFrom,mailTo,latitude,longitude,country 
				FROM postcards
				WHERE mailTo is null
				"""
			mycursor.execute(query)

			results = mycursor.fetchall()
			# print(results)

			# 將 latitude 和 longitude 的 Decimal 類型轉為 float (Fix : Object of type Decimal is not JSON serializable)
			for result in results:
				result['latitude'] = float(result['latitude'])
				result['longitude'] = float(result['longitude'])

			# 將查詢結果透過 WebSocket 發送到客戶端
			await ws.send_text(json.dumps({'postcard':results,'action':'add'}))
			# print(results)
	except WebSocketDisconnect :
		manager.disconnect(ws)
	except Exception as e :
		print("發生錯誤 : ", e)


async def broadcast_queue_update(postcard : list, action : str) :
	try :
		message = {'postcard': postcard, 'action': action}
		message_str = json.dumps(message)
		await manager.broadcast(message_str)
	except Exception as e :
		print("發生錯誤 : ", e)



# 顯示動畫的 websocket
@app.websocket("/ws/queue")
async def ws_queue(ws: WebSocket):
	await manager.connect(ws)
	await send_all_queue(ws)  # 加載初始的等待配對信件
	try :
		while True:
			data = await ws.receive_text()
			# await broadcast_queue_update(data)
	except WebSocketDisconnect :
		manager.disconnect(ws)



# 直接進行配對 + 新增明信片 + 變更用戶配對權重分數
@app.get("/api/pairing", response_class=JSONResponse)
async def pair_postcards(request: Request):

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

		# 將資料存到資料庫
		with mysql.connector.connect(pool_name="hello") as mydb, mydb.cursor(buffered=True,dictionary=True) as mycursor :

			query = """
				SELECT name, score
				FROM postcard_users
				WHERE id != %s 
				ORDER BY score DESC;
				"""
			mycursor.execute(query, (myjwtx["id"],))
			highest_scoring_users = mycursor.fetchall()


			# 3. 選擇最高分收件人，隨機選擇一個（如果有多個）
			max_score = highest_scoring_users[0]['score']
			candidates = [user for user in highest_scoring_users if user['score'] == max_score]

			from random import choice
			selected_user = choice(candidates)
			receiver_id = selected_user['id']

			return {
				"pair_id": receiver_id
				} 
