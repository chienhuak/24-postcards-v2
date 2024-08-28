# 執行每日定時任務
import requests
import schedule
import time
from datetime import datetime


def run_matching():
	try :
		response = requests.get('http://localhost:8000/api/matching')
		print(f'定時任務已執行: {response.status_code}, {response.json()}')
	except requests.exceptions.RequestException as e:
		print(f"定時任務錯誤 Request failed: {e}")


# 每天定時執行
schedule.every().day.at("15:20").do(run_matching)

# 每分鐘執行一次
# schedule.every(1).minutes.do(run_matching)


while True:
	print("正在運行中...",datetime.utcnow())
	schedule.run_pending()
	time.sleep(30)