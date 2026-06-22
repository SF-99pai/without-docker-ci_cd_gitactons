import json, urllib.request
url='http://127.0.0.1:8000/employees'
payload={'name':'CLI Test','email':'cli@test.local','department':'DevOps'}
data=json.dumps(payload).encode('utf-8')
req=urllib.request.Request(url,data=data,headers={'Content-Type':'application/json'})
try:
    resp=urllib.request.urlopen(req)
    print('POST response:',resp.read().decode())
except Exception as e:
    print('POST error:',e)
try:
    resp=urllib.request.urlopen(url)
    print('GET response:',resp.read().decode())
except Exception as e:
    print('GET error:',e)
