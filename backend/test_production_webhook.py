import hmac
import hashlib
import json
import urllib.request
import sys
import time

def main():
    print("--- SafeSpace Webhook Production Test Utility ---")
    
    # Prompt for variables or use defaults
    webhook_url = input("Enter production Webhook URL (e.g. https://your-backend.onrender.com/api/webhooks/campus-one): ").strip()
    webhook_secret = input("Enter CAMPUS_ONE_WEBHOOK_SECRET: ").strip()
    
    if not webhook_url or not webhook_secret:
        print("Error: Webhook URL and Webhook Secret are required.")
        sys.exit(1)
        
    user_type = input("Enter user type to test (student / staff / admin) [student]: ").strip().lower() or "student"
    
    # Generate unique test data based on timestamp
    ts = int(time.time())
    
    if user_type == "student":
        role = "student"
        student_id = f"STUD_TEST_{ts}"
        email = f"test_student_{ts}@nileuniversity.edu.ng"
        name = f"Test Student {ts}"
        data = {
            "user_id": f"c1_user_student_{ts}",
            "email": email,
            "name": name,
            "role": role,
            "student_id": student_id,
            "level": 100,
            "faculty_id": "fac_test",
            "department_id": "dept_test"
        }
    elif user_type == "staff":
        role = "staff"
        staff_id = f"STAFF_TEST_{ts}"
        email = f"test_staff_{ts}@nileuniversity.edu.ng"
        name = f"Test Staff {ts}"
        data = {
            "user_id": f"c1_user_staff_{ts}",
            "email": email,
            "name": name,
            "role": role,
            "staff_id": staff_id,
            "custom_roles": ["psychologist"],
            "roles": ["staff", "psychologist"]
        }
    elif user_type == "admin":
        role = "staff"
        staff_id = f"ADMIN_TEST_{ts}"
        email = f"test_admin_{ts}@nileuniversity.edu.ng"
        name = f"Test Admin {ts}"
        data = {
            "user_id": f"c1_user_admin_{ts}",
            "email": email,
            "name": name,
            "role": role,
            "staff_id": staff_id,
            "roles": ["staff", "unit_head"]
        }
    else:
        print("Invalid user type.")
        sys.exit(1)
        
    payload = {
        "id": f"evt_{ts}",
        "event": "user.created",
        "occurredAt": "2026-06-22T04:00:00.000Z",
        "data": data
    }
    
    body_bytes = json.dumps(payload).encode("utf-8")
    
    # Calculate signature
    signature = "sha256=" + hmac.new(webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
    
    print(f"\nSending payload for {name} ({email})...")
    req = urllib.request.Request(
        webhook_url,
        data=body_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Campus-One-Signature": signature
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            status_code = response.status
            response_body = response.read().decode("utf-8")
            print(f"Success! Response status: {status_code}")
            print(f"Response body: {response_body}")
            print(f"\nUser {name} should now be successfully provisioned in your database!")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(e.read().decode("utf-8"))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
