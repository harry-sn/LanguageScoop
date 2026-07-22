#!/usr/bin/env python3
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import unittest
import requests
import uuid
import os

BASE_URL = os.getenv("BASE_URL", "http://localhost:3000/api")

class TestPhase3Hardening(unittest.TestCase):

    def setUp(self):
        # Register a new unique teacher for test isolation with fresh IP
        self.ip = f"192.168.1.{uuid.uuid4().int % 200 + 1}"
        self.teacher_email = f"teacher_{uuid.uuid4().hex[:8]}@example.com"
        self.teacher_password = "Password123!"
        reg_res = requests.post(f"{BASE_URL}/auth/register", headers={"X-Forwarded-For": self.ip}, json={
            "email": self.teacher_email,
            "password": self.teacher_password,
            "name": "Prof. H. Alpha"
        })
        self.assertEqual(reg_res.status_code, 200, f"Register teacher failed: {reg_res.text}")
        self.teacher_token = reg_res.json()["token"]
        self.teacher_headers = {"Authorization": f"Bearer {self.teacher_token}", "X-Forwarded-For": self.ip}

    def test_student_password_reset_and_change_flow(self):
        student_email = f"student_{uuid.uuid4().hex[:8]}@example.com"

        # 1. Teacher creates student
        s_res = requests.post(f"{BASE_URL}/students", headers=self.teacher_headers, json={
            "name": "Jean Dupont",
            "email": student_email,
            "feePerClass": 800,
            "defaultPackSize": 8,
            "paymentAmount": 6400
        })
        self.assertEqual(s_res.status_code, 200, f"Create student failed: {s_res.text}")
        student = s_res.json()["student"]
        student_id = student["id"]

        # 2. Teacher resets student password to 'NewStudentPass456'
        reset_pw = "NewStudentPass456"
        reset_res = requests.post(f"{BASE_URL}/students/{student_id}/reset-password", headers=self.teacher_headers, json={
            "newPassword": reset_pw
        })
        self.assertEqual(reset_res.status_code, 200, f"Reset password failed: {reset_res.text}")
        self.assertTrue(reset_res.json().get("ok"))

        # 3. Student logs in with reset password
        login_res = requests.post(f"{BASE_URL}/auth/login", headers={"X-Forwarded-For": self.ip}, json={
            "email": student_email,
            "password": reset_pw
        })
        self.assertEqual(login_res.status_code, 200, f"Student login failed with reset password: {login_res.text}")
        student_token = login_res.json()["token"]
        student_headers = {"Authorization": f"Bearer {student_token}", "X-Forwarded-For": self.ip}

        # 4. Student changes own password
        final_pw = "FinalStudentPass789"
        change_res = requests.post(f"{BASE_URL}/student/change-password", headers=student_headers, json={
            "oldPassword": reset_pw,
            "newPassword": final_pw
        })
        self.assertEqual(change_res.status_code, 200, f"Change password failed: {change_res.text}")

        # 5. Student logs in with final password
        final_login = requests.post(f"{BASE_URL}/auth/login", headers={"X-Forwarded-For": self.ip}, json={
            "email": student_email,
            "password": final_pw
        })
        self.assertEqual(final_login.status_code, 200, "Student login failed with final password")

    def test_auth_rate_limiter(self):
        # Fire requests with a dedicated IP header to test rate limit (10 limit)
        dummy_email = f"ratelimit_{uuid.uuid4().hex[:8]}@example.com"
        rate_headers = {"X-Forwarded-For": "10.0.0.99"}
        responses = []
        for i in range(12):
            res = requests.post(f"{BASE_URL}/auth/login", headers=rate_headers, json={
                "email": dummy_email,
                "password": "wrongpassword"
            })
            responses.append(res.status_code)

        # At least one request beyond 10 must return HTTP 429
        self.assertIn(429, responses, f"Expected 429 status code in rate limit test responses: {responses}")


if __name__ == '__main__':
    unittest.main()
