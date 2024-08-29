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

@app.get("/countries.json", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/countries.json", media_type="application/json")

@app.get("/collections", include_in_schema=False)
async def collections(request: Request):
	return FileResponse("./static/collections.html", media_type="text/html")

@app.get("/painting", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/painting.html", media_type="text/html")

@app.get("/history", include_in_schema=False)
async def feed(request: Request):
	return FileResponse("./static/home.html", media_type="text/html")


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

			mydb.commit()
			
			await broadcast_queue_update([postcard_id,], 'add')

			return JSONResponse(status_code=200, content={
					"name": myjwtx["name"], 
					"country": myjwtx["country"], 
					"message": data["message"],
					"latitude": data["latitude"],
					"longitude": data["longitude"]})


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

			broadcast_del_list.append(i[0])
			broadcast_del_list.append(i[1])

		mydb.commit()

		broadcast_queue_update(broadcast_del_list, 'delete')

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

			mydb.commit()

			return JSONResponse(status_code=200, content={
				"data": "ok"})
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
		FROM postcards 
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
@app.get("/api/unread", response_class=JSONResponse)
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
			print(results)

			# 將 latitude 和 longitude 的 Decimal 類型轉為 float (Fix : Object of type Decimal is not JSON serializable)
			for result in results:
				result['latitude'] = float(result['latitude'])
				result['longitude'] = float(result['longitude'])
				result['action'] = "add"

			# 將查詢結果透過 WebSocket 發送到客戶端
			await ws.send_text(json.dumps(results))
			# print(results)
	except WebSocketDisconnect :
		manager.disconnect(ws)
	except Exception as e :
		print("發生錯誤 : ", e)


async def broadcast_queue_update(postcard_id : list, action : str) :
	try :
		message = [{'postcardID': postcard_id, 'action': action}]
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
			await broadcast_queue_update(data)
	except WebSocketDisconnect :
		manager.disconnect(ws)


