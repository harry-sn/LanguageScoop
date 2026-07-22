import unittest
import requests
import json
import os

BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:3000/api")

class TestClassPackBilling(unittest.TestCase):
    def setUp(self):
        # Register a unique teacher for tests
        import uuid
        self.email = f"teacher_{uuid.uuid4().hex[:8]}@example.com"
        self.password = "password123"
        res = requests.post(f"{BASE_URL}/auth/register", json={
            "email": self.email,
            "password": self.password,
            "name": "Test Teacher",
            "academyName": "Test Academy"
        })
        self.assertEqual(res.status_code, 200, f"Register failed: {res.text}")
        data = res.json()
        self.token = data["token"]
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    def test_student_creation_with_pack_and_payment(self):
        import uuid
        # Create student with default pack size 8 and fee 800
        s_res = requests.post(f"{BASE_URL}/students", headers=self.headers, json={
            "name": "Jean Dupont",
            "email": f"jean_{uuid.uuid4().hex[:8]}@example.com",
            "level": "A1",
            "feePerClass": 800,
            "defaultPackSize": 8,
            "paymentAmount": 6400,
            "paymentMethod": "upi"
        })
        self.assertEqual(s_res.status_code, 200, s_res.text)
        s_data = s_res.json()
        student = s_data["student"]
        pack = s_data["pack"]

        self.assertIsNotNone(student.get("activePackId"))
        self.assertEqual(pack["totalClasses"], 8)
        self.assertEqual(pack["usedClasses"], 0)
        self.assertEqual(pack["remainingClasses"], 8)
        self.assertEqual(pack["totalAmount"], 6400)
        self.assertEqual(pack["paidAmount"], 6400)
        self.assertEqual(pack["status"], "active")

    def test_attendance_deduction_and_reversal_idempotency(self):
        import uuid
        # 1. Create student
        s_res = requests.post(f"{BASE_URL}/students", headers=self.headers, json={
            "name": "Marie Curie",
            "email": f"marie_{uuid.uuid4().hex[:8]}@example.com",
            "feePerClass": 1000,
            "defaultPackSize": 5,
            "paymentAmount": 5000
        })
        self.assertEqual(s_res.status_code, 200, s_res.text)
        student = s_res.json()["student"]
        student_id = student["id"]

        # 2. Schedule a class
        c_res = requests.post(f"{BASE_URL}/classes", headers=self.headers, json={
            "studentId": student_id,
            "startTime": "2026-07-25T10:00:00Z",
            "duration": 60,
            "topic": "Grammar"
        })
        self.assertEqual(c_res.status_code, 200)
        cls = c_res.json()["classes"][0]
        class_id = cls["id"]

        # 3. Mark attendance as Present
        att_res = requests.post(f"{BASE_URL}/classes/{class_id}/attendance", headers=self.headers, json={
            "status": "present",
            "isBillable": True
        })
        self.assertEqual(att_res.status_code, 200)

        # Verify pack credit deducted: 1 used, 4 remaining
        s_detail = requests.get(f"{BASE_URL}/students/{student_id}", headers=self.headers).json()
        pack = s_detail["activePack"]
        self.assertEqual(pack["usedClasses"], 1)
        self.assertEqual(pack["remainingClasses"], 4)

        # 4. Mark attendance again as Present (Idempotent test)
        requests.post(f"{BASE_URL}/classes/{class_id}/attendance", headers=self.headers, json={
            "status": "present",
            "isBillable": True
        })
        s_detail = requests.get(f"{BASE_URL}/students/{student_id}", headers=self.headers).json()
        pack = s_detail["activePack"]
        self.assertEqual(pack["usedClasses"], 1, "Duplicate attendance call must not double deduct credit")

        # 5. Change attendance to Teacher Cancelled (Reversal test)
        rev_res = requests.post(f"{BASE_URL}/classes/{class_id}/attendance", headers=self.headers, json={
            "status": "teacher_cancelled",
            "isBillable": False
        })
        self.assertEqual(rev_res.status_code, 200)
        s_detail = requests.get(f"{BASE_URL}/students/{student_id}", headers=self.headers).json()
        pack = s_detail["activePack"]
        self.assertEqual(pack["usedClasses"], 0, "Teacher cancellation must reverse the pack deduction")
        self.assertEqual(pack["remainingClasses"], 5)

    def test_pack_exhaustion_prevents_negative_balance(self):
        import uuid
        # Create student with small 1-class pack
        s_res = requests.post(f"{BASE_URL}/students", headers=self.headers, json={
            "name": "Small Pack Student",
            "email": f"smallpack_{uuid.uuid4().hex[:8]}@example.com",
            "feePerClass": 500,
            "defaultPackSize": 1,
            "paymentAmount": 500
        })
        self.assertEqual(s_res.status_code, 200, s_res.text)
        student_id = s_res.json()["student"]["id"]

        # Schedule class 1 and deduct
        c1 = requests.post(f"{BASE_URL}/classes", headers=self.headers, json={
            "studentId": student_id,
            "startTime": "2026-07-20T10:00:00Z"
        }).json()["classes"][0]
        requests.post(f"{BASE_URL}/classes/{c1['id']}/attendance", headers=self.headers, json={"status": "present", "isBillable": True})

        # Pack should now have 0 remaining classes and status 'completed'
        s_detail = requests.get(f"{BASE_URL}/students/{student_id}", headers=self.headers).json()
        pack = s_detail["activePack"]
        self.assertEqual(pack["remainingClasses"], 0)
        self.assertEqual(pack["status"], "completed")

        # Schedule class 2 and mark present when pack is exhausted
        c2 = requests.post(f"{BASE_URL}/classes", headers=self.headers, json={
            "studentId": student_id,
            "startTime": "2026-07-21T10:00:00Z"
        }).json()["classes"][0]
        att2 = requests.post(f"{BASE_URL}/classes/{c2['id']}/attendance", headers=self.headers, json={"status": "present", "isBillable": True}).json()["class"]

        self.assertTrue(att2.get("requiresPackResolution"), "Class marked present without pack credits must require resolution")

        # Verify pack balance did NOT drop below 0
        s_detail = requests.get(f"{BASE_URL}/students/{student_id}", headers=self.headers).json()
        pack = s_detail["activePack"]
        self.assertEqual(pack["usedClasses"], 1)
        self.assertEqual(pack["remainingClasses"], 0, "Pack balance must not drop below zero")

    def test_renew_pack_workflow(self):
        import uuid
        # Create student
        s_res = requests.post(f"{BASE_URL}/students", headers=self.headers, json={
            "name": "Renewal Student",
            "email": f"renew_{uuid.uuid4().hex[:8]}@example.com",
            "feePerClass": 800,
            "defaultPackSize": 4,
            "paymentAmount": 3200
        })
        self.assertEqual(s_res.status_code, 200, s_res.text)
        student_id = s_res.json()["student"]["id"]
        old_pack_id = s_res.json()["student"]["activePackId"]

        # Renew pack with 8 classes
        renew_res = requests.post(f"{BASE_URL}/students/{student_id}/renew-pack", headers=self.headers, json={
            "feePerClass": 850,
            "totalClasses": 8,
            "paymentAmount": 6800,
            "paymentMethod": "upi",
            "reference": "UPI12345"
        })
        self.assertEqual(renew_res.status_code, 200, renew_res.text)
        r_data = renew_res.json()
        new_pack = r_data["pack"]

        self.assertNotEqual(new_pack["id"], old_pack_id)
        self.assertEqual(new_pack["totalClasses"], 8)
        self.assertEqual(new_pack["remainingClasses"], 8)
        self.assertEqual(new_pack["feePerClassSnapshot"], 850)
        self.assertEqual(new_pack["totalAmount"], 6800)
        self.assertEqual(new_pack["paidAmount"], 6800)
        self.assertEqual(new_pack["status"], "active")

        # Verify old pack was marked completed
        pack_detail = requests.get(f"{BASE_URL}/class-packs/{old_pack_id}", headers=self.headers).json()["pack"]
        self.assertEqual(pack_detail["status"], "completed")

    def test_billing_summary_cards(self):
        res = requests.get(f"{BASE_URL}/billing/summary?month=2026-07", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("summaryCards", data)
        cards = data["summaryCards"]
        self.assertIn("completedThisMonth", cards)
        self.assertIn("billableThisMonth", cards)
        self.assertIn("activePacks", cards)
        self.assertIn("lowBalancePacks", cards)
        self.assertIn("renewalsRequired", cards)
        self.assertIn("advancePaymentsThisMonth", cards)
        self.assertIn("packPaymentsOutstanding", cards)

if __name__ == "__main__":
    unittest.main()
