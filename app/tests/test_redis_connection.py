import redis

try:
    redis_cli = redis.Redis(
        host='localhost',
        port=6379,
        decode_responses=True 
    )

    connection_status = redis_cli.ping()
    if connection_status:
        print("✅ Connected to Redis successfully!")
        redis_cli.set("greeting", "Hello, Docker Redis!")
        value = redis_cli.get("greeting")
        print(f"Retrieved value: {value}")
    else:
        print("❌ Ping failed — connection not confirmed.")
except redis.exceptions.ConnectionError as e:
    print(f"❌ Connection error: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")

