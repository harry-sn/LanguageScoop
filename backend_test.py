#!/usr/bin/env python3
"""
Backend API tests for Language Scoop - NEW FEATURES ONLY
Tests file uploads, push notifications, homework attachments, and class reminders
"""

import requests
import json
import base64
import sys

# Base URL from .env
BASE_URL = "https://student-dash-test.preview.emergentagent.com/api"

# Test credentials
TEACHER_EMAIL = "teacher@demo.com"
TEACHER_PASSWORD = "demo1234"
STUDENT_EMAIL = "riya@demo.com"
STUDENT_PASSWORD = "demo1234"

# Global tokens
teacher_token = None
student_token = None
student_id = None
student_user_id = None
class_id = None
homework_id = None
file_id = None

def print_test(name):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print('='*60)

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def login_teacher():
    global teacher_token
    print_test("Teacher Login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEACHER_EMAIL,
            "password": TEACHER_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            teacher_token = data.get('token')
            print_success(f"Teacher logged in successfully")
            return True
        else:
            print_error(f"Teacher login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Teacher login exception: {str(e)}")
        return False

def login_student():
    global student_token
    print_test("Student Login")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            student_token = data.get('token')
            print_success(f"Student logged in successfully")
            return True
        else:
            print_error(f"Student login failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Student login exception: {str(e)}")
        return False

def get_student_info():
    global student_id, student_user_id
    print_test("Get Student Info")
    try:
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.get(f"{BASE_URL}/students", headers=headers)
        if response.status_code == 200:
            data = response.json()
            students = data.get('students', [])
            for s in students:
                if s.get('email') == STUDENT_EMAIL:
                    student_id = s.get('id')
                    student_user_id = s.get('userId')
                    print_success(f"Found student: id={student_id}, userId={student_user_id}")
                    return True
            print_error("Student not found in list")
            return False
        else:
            print_error(f"Get students failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Get student info exception: {str(e)}")
        return False

def get_class_id():
    global class_id
    print_test("Get Class ID for Reminder Test")
    try:
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.get(f"{BASE_URL}/classes", headers=headers)
        if response.status_code == 200:
            data = response.json()
            classes = data.get('classes', [])
            if classes:
                class_id = classes[0].get('id')
                print_success(f"Found class: id={class_id}")
                return True
            else:
                print_error("No classes found")
                return False
        else:
            print_error(f"Get classes failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Get class ID exception: {str(e)}")
        return False

# ============ FILE UPLOAD TESTS ============

def test_file_upload_success():
    global file_id
    print_test("File Upload - Success (small file)")
    try:
        # Create a small test file (< 5MB)
        test_content = "Hello, this is a test file for Language Scoop!"
        test_base64 = base64.b64encode(test_content.encode()).decode()
        data_url = f"data:text/plain;base64,{test_base64}"
        
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.post(f"{BASE_URL}/files/upload", headers=headers, json={
            "name": "test-document.txt",
            "type": "text/plain",
            "size": len(test_content),
            "dataUrl": data_url
        })
        
        if response.status_code == 200:
            data = response.json()
            file_id = data.get('id')
            url = data.get('url')
            print_success(f"File uploaded successfully: id={file_id}, url={url}")
            if file_id and url and data.get('name') == "test-document.txt":
                print_success("Response contains all required fields")
                return True
            else:
                print_error("Response missing required fields")
                return False
        else:
            print_error(f"File upload failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"File upload exception: {str(e)}")
        return False

def test_file_upload_too_large():
    print_test("File Upload - Rejection (> 5MB)")
    try:
        # Create a file larger than 5MB
        large_content = "x" * (6 * 1024 * 1024)  # 6MB
        large_base64 = base64.b64encode(large_content.encode()).decode()
        data_url = f"data:text/plain;base64,{large_base64}"
        
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.post(f"{BASE_URL}/files/upload", headers=headers, json={
            "name": "large-file.txt",
            "type": "text/plain",
            "size": len(large_content),
            "dataUrl": data_url
        })
        
        if response.status_code == 400:
            print_success("Large file correctly rejected with 400 status")
            return True
        else:
            print_error(f"Expected 400, got {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"File upload rejection test exception: {str(e)}")
        return False

def test_file_download_public():
    print_test("File Download - Public Access (no auth)")
    try:
        if not file_id:
            print_error("No file_id available, skipping test")
            return False
        
        # Try to download without auth
        response = requests.get(f"{BASE_URL}/files/{file_id}")
        
        if response.status_code == 200:
            content_type = response.headers.get('Content-Type')
            if content_type == 'text/plain':
                print_success(f"File downloaded successfully without auth, Content-Type: {content_type}")
                print_success(f"File content length: {len(response.content)} bytes")
                return True
            else:
                print_error(f"Wrong Content-Type: {content_type}")
                return False
        else:
            print_error(f"File download failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"File download exception: {str(e)}")
        return False

# ============ PUSH NOTIFICATION TESTS ============

def test_push_status_initial():
    print_test("Push Notifications - Initial Status")
    try:
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.get(f"{BASE_URL}/push/status", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            enabled = data.get('enabled')
            count = data.get('count')
            print_success(f"Push status retrieved: enabled={enabled}, count={count}")
            return True
        else:
            print_error(f"Push status failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Push status exception: {str(e)}")
        return False

def test_push_subscribe():
    print_test("Push Notifications - Subscribe")
    try:
        # Mock subscription object
        mock_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-12345",
            "keys": {
                "p256dh": "BJ1234567890abcdefghijklmnopqrstuvwxyz",
                "auth": "xyz123auth"
            }
        }
        
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.post(f"{BASE_URL}/push/subscribe", headers=headers, json={
            "subscription": mock_subscription
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                print_success("Push subscription successful")
                return True
            else:
                print_error("Push subscription response missing 'ok' field")
                return False
        else:
            print_error(f"Push subscribe failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Push subscribe exception: {str(e)}")
        return False

def test_push_status_after_subscribe():
    print_test("Push Notifications - Status After Subscribe")
    try:
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.get(f"{BASE_URL}/push/status", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            enabled = data.get('enabled')
            count = data.get('count')
            if enabled and count >= 1:
                print_success(f"Push status updated: enabled={enabled}, count={count}")
                return True
            else:
                print_error(f"Push status not updated correctly: enabled={enabled}, count={count}")
                return False
        else:
            print_error(f"Push status failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Push status exception: {str(e)}")
        return False

def test_push_test_notification():
    print_test("Push Notifications - Test Send")
    try:
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.post(f"{BASE_URL}/push/test", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                print_success("Push test notification sent (may fail to deliver due to mock endpoint)")
                return True
            else:
                print_error("Push test response missing 'ok' field")
                return False
        else:
            print_error(f"Push test failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Push test exception: {str(e)}")
        return False

def test_push_unsubscribe():
    print_test("Push Notifications - Unsubscribe")
    try:
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.post(f"{BASE_URL}/push/unsubscribe", headers=headers, json={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-12345"
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                print_success("Push unsubscribe successful")
                return True
            else:
                print_error("Push unsubscribe response missing 'ok' field")
                return False
        else:
            print_error(f"Push unsubscribe failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Push unsubscribe exception: {str(e)}")
        return False

# ============ HOMEWORK WITH ATTACHMENTS TESTS ============

def test_homework_create_with_attachments():
    global homework_id
    print_test("Homework - Create with Attachments")
    try:
        if not student_id:
            print_error("No student_id available, skipping test")
            return False
        
        # Create homework with attachments
        attachments = [
            {
                "id": file_id if file_id else "mock-file-id",
                "name": "test-document.txt",
                "type": "text/plain",
                "size": 100,
                "url": f"/api/files/{file_id if file_id else 'mock-file-id'}"
            }
        ]
        
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.post(f"{BASE_URL}/homework", headers=headers, json={
            "studentId": student_id,
            "title": "Test Homework with Attachments",
            "instructions": "Complete the exercises in the attached document",
            "dueDate": "2025-12-31T23:59:59Z",
            "attachments": attachments
        })
        
        if response.status_code == 200:
            data = response.json()
            homework = data.get('homework')
            homework_id = homework.get('id')
            hw_attachments = homework.get('attachments', [])
            if homework_id and len(hw_attachments) > 0:
                print_success(f"Homework created with attachments: id={homework_id}, attachments={len(hw_attachments)}")
                return True
            else:
                print_error("Homework created but attachments missing")
                return False
        else:
            print_error(f"Homework creation failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Homework creation exception: {str(e)}")
        return False

def test_homework_submit_with_attachments():
    print_test("Homework - Submit with Attachments (as student)")
    try:
        if not homework_id:
            print_error("No homework_id available, skipping test")
            return False
        
        # Submit homework with attachments
        submission_attachments = [
            {
                "id": "student-file-id",
                "name": "my-solution.pdf",
                "type": "application/pdf",
                "size": 2048,
                "url": "/api/files/student-file-id"
            }
        ]
        
        headers = {"Authorization": f"Bearer {student_token}"}
        response = requests.post(f"{BASE_URL}/homework/{homework_id}/submit", headers=headers, json={
            "submissionText": "I have completed all exercises",
            "submissionAttachments": submission_attachments
        })
        
        if response.status_code == 200:
            data = response.json()
            homework = data.get('homework')
            sub_attachments = homework.get('submissionAttachments', [])
            if len(sub_attachments) > 0:
                print_success(f"Homework submitted with attachments: {len(sub_attachments)} files")
                return True
            else:
                print_error("Homework submitted but attachments missing")
                return False
        else:
            print_error(f"Homework submission failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Homework submission exception: {str(e)}")
        return False

def test_homework_get_with_attachments():
    print_test("Homework - Verify Attachments on GET")
    try:
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.get(f"{BASE_URL}/homework", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            homework_list = data.get('homework', [])
            found = False
            for hw in homework_list:
                if hw.get('id') == homework_id:
                    found = True
                    attachments = hw.get('attachments', [])
                    sub_attachments = hw.get('submissionAttachments', [])
                    if len(attachments) > 0 and len(sub_attachments) > 0:
                        print_success(f"Homework retrieved with attachments: {len(attachments)} teacher, {len(sub_attachments)} student")
                        return True
                    else:
                        print_error(f"Attachments missing: teacher={len(attachments)}, student={len(sub_attachments)}")
                        return False
            if not found:
                print_error("Homework not found in list")
                return False
        else:
            print_error(f"Get homework failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Get homework exception: {str(e)}")
        return False

# ============ CLASS REMINDER TESTS ============

def test_class_reminder():
    print_test("Class Reminder - Send Push Notification")
    try:
        if not class_id:
            print_error("No class_id available, skipping test")
            return False
        
        headers = {"Authorization": f"Bearer {teacher_token}"}
        response = requests.post(f"{BASE_URL}/classes/{class_id}/remind", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('ok'):
                print_success("Class reminder sent successfully")
                return True
            else:
                print_error("Class reminder response missing 'ok' field")
                return False
        else:
            print_error(f"Class reminder failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Class reminder exception: {str(e)}")
        return False

# ============ MAIN TEST RUNNER ============

def main():
    print("\n" + "="*60)
    print("LANGUAGE SCOOP - NEW FEATURES BACKEND API TESTS")
    print("="*60)
    
    results = []
    
    # Setup
    results.append(("Teacher Login", login_teacher()))
    results.append(("Student Login", login_student()))
    results.append(("Get Student Info", get_student_info()))
    results.append(("Get Class ID", get_class_id()))
    
    # File Upload Tests
    results.append(("File Upload - Success", test_file_upload_success()))
    results.append(("File Upload - Too Large", test_file_upload_too_large()))
    results.append(("File Download - Public", test_file_download_public()))
    
    # Push Notification Tests
    results.append(("Push Status - Initial", test_push_status_initial()))
    results.append(("Push Subscribe", test_push_subscribe()))
    results.append(("Push Status - After Subscribe", test_push_status_after_subscribe()))
    results.append(("Push Test Notification", test_push_test_notification()))
    results.append(("Push Unsubscribe", test_push_unsubscribe()))
    
    # Homework with Attachments Tests
    results.append(("Homework - Create with Attachments", test_homework_create_with_attachments()))
    results.append(("Homework - Submit with Attachments", test_homework_submit_with_attachments()))
    results.append(("Homework - GET with Attachments", test_homework_get_with_attachments()))
    
    # Class Reminder Test
    results.append(("Class Reminder", test_class_reminder()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print("\n" + "="*60)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*60)
    
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
