import unittest
from adapters.tuya_cloud_adapter import TuyaBinding, TuyaCloudAdapter, TuyaCloudError, official_api_from_environment

class FakeOfficialSDK:
    def __init__(self):
        self.calls = []
        self.function_rows = [{"code": "switch_1", "type": "Boolean", "values": "{}"}]
        self.state_rows = [{"code": "switch_1", "value": False}]
        self.fail_post = False
        self.fail_status = False
    def get(self, path):
        self.calls.append(("GET", path))
        if path.endswith("/functions"):
            return {"success": True, "result": {"functions": self.function_rows}}
        if self.fail_status:
            return {"success": False, "msg": "secret do not leak"}
        return {"success": True, "result": self.state_rows}
    def post(self, path, body):
        self.calls.append(("POST", path, body))
        if self.fail_post:
            raise TimeoutError("simulated lost ACK")
        self.state_rows = [{"code": body["commands"][0]["code"], "value": body["commands"][0]["value"]}]
        return {"success": True, "result": True}

class CloudTests(unittest.TestCase):
    def setUp(self):
        self.api = FakeOfficialSDK()
        self.client = TuyaCloudAdapter(self.api, TuyaBinding("deviceA", "switch_1", "tenantA"))
    def test_read_only_discovery(self):
        self.assertEqual(self.client.inspect()["cloud_status"], False)
        self.assertFalse(any(c[0] == "POST" for c in self.api.calls))
    def test_default_deny(self):
        self.assertEqual(self.client.set_bool(value=True, tenant_id="tenantA", approved=True)["disposition"], "DENIED")
        self.assertEqual(len(self.api.calls), 0)
    def test_tenant_mismatch_and_bad_value(self):
        self.client.live_enabled=True
        self.assertEqual(self.client.set_bool(value=True, tenant_id="other", approved=True)["reason"], "TENANT_MISMATCH")
        self.assertEqual(self.client.set_bool(value=1, tenant_id="tenantA", approved=True)["reason"], "INVALID_ARGUMENTS")
        self.assertFalse(self.api.calls)
    def test_approval_gate(self):
        self.client.live_enabled=True
        self.assertEqual(self.client.set_bool(value=True, tenant_id="tenantA")["reason"], "LIVE_WRITE_NOT_APPROVED")
    def test_bounded_success_never_claims_physical_proof(self):
        self.client.live_enabled=True
        result=self.client.set_bool(value=True, tenant_id="tenantA", approved=True)
        self.assertEqual(result["disposition"], "CLOUD_STATUS_MATCH")
        self.assertFalse(result["physical_proof"])
        self.assertEqual(self.api.calls[1], ("POST", "/v1.0/devices/deviceA/commands", {"commands": [{"code":"switch_1", "value":True}]}))
    def test_unsupported_dp(self):
        self.client.live_enabled=True
        self.api.function_rows=[]
        self.assertEqual(self.client.set_bool(value=True, tenant_id="tenantA", approved=True)["reason"], "BOOLEAN_CAPABILITY_NOT_ADVERTISED")
        self.assertFalse(any(c[0]=="POST" for c in self.api.calls))
    def test_timeout_does_not_retry(self):
        self.client.live_enabled=True
        self.api.fail_post=True
        self.assertEqual(self.client.set_bool(value=True, tenant_id="tenantA", approved=True)["disposition"], "UNKNOWN")
        self.assertEqual(sum(c[0]=="POST" for c in self.api.calls),1)
    def test_failed_readback_does_not_confirm(self):
        self.client.live_enabled=True
        self.api.fail_status=True
        result=self.client.set_bool(value=True, tenant_id="tenantA", approved=True)
        self.assertEqual(result["disposition"], "UNKNOWN")
    def test_stale_readback_is_unverified(self):
        self.client.live_enabled=True
        def stale_post(path, body):
            self.api.calls.append(("POST",path,body))
            return {"success":True,"result":True}
        self.api.post=stale_post
        self.assertEqual(self.client.set_bool(value=True, tenant_id="tenantA", approved=True)["disposition"],"UNVERIFIED")
    def test_no_duplicate_or_invalid_dp_codes(self):
        with self.assertRaises(ValueError): TuyaBinding("../other", "switch_1", "tenantA")
        self.client.live_enabled=True
        self.api.function_rows *= 2
        self.assertEqual(self.client.set_bool(value=True, tenant_id="tenantA", approved=True)["disposition"],"DENIED")
    def test_iot_03_api_path(self):
        adapter = TuyaCloudAdapter(self.api, TuyaBinding("deviceA", "switch_1", "tenantA"), api_family="iot-03")
        adapter.inspect()
        self.assertEqual(self.api.calls[0][1], "/v1.0/iot-03/devices/deviceA/functions")
    def test_cloud_credentials_only_official_region_hosts(self):
        with self.assertRaises(ValueError): official_api_from_environment({"TUYA_API_ENDPOINT":"https://evil.example", "TUYA_ACCESS_ID":"abc", "TUYA_ACCESS_SECRET":"secret"})
    def test_malformed_status_fails_closed_and_no_leak(self):
        self.api.fail_status=True
        with self.assertRaises(TuyaCloudError) as cm:
            self.client.inspect()
        self.assertNotIn("secret do not leak",str(cm.exception))

if __name__ == "__main__": unittest.main()
