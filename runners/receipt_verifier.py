"""Dependency-free fake-device receipt verifier. Not proof of physical-world effects."""

def verify(command, receipt, observation):
    """Never mark an execution successful without matching authority and state."""
    if not all(isinstance(x, dict) for x in (command, receipt, observation)):
        return "UNKNOWN"
    if command.get("authorization") != "ALLOW":
        return "DENIED"
    keys = ("command_id", "tenant_id", "device_id", "capability", "idempotency_key", "digest")
    if any(not command.get(k) or command[k] != receipt.get(k) for k in keys):
        return "UNKNOWN"
    if command["capability"] != "lamp.set_power":
        return "UNKNOWN"
    args = command.get("arguments")
    if not isinstance(args, dict) or type(args.get("on")) is not bool:
        return "UNKNOWN"
    if receipt.get("status") != "EXECUTED" or observation.get("device_id") != command["device_id"]:
        return "UNKNOWN"
    if observation.get("tenant_id") != command["tenant_id"] or type(observation.get("lampOn")) is not bool:
        return "UNKNOWN"
    rv, ov = receipt.get("version"), observation.get("version")
    if type(rv) is not int or type(ov) is not int or rv < 0 or ov < rv:
        return "UNKNOWN"
    if observation["lampOn"] is not args["on"]:
        return "UNKNOWN"
    if receipt.get("observed", {}).get("lampOn") is not args["on"]:
        return "UNKNOWN"
    return "CONFIRMED_IN_FAKE_SERVICE"


if __name__ == "__main__":
    import unittest

    class VerificationTests(unittest.TestCase):
        def setUp(self):
            self.c = dict(authorization="ALLOW", command_id="c1", tenant_id="t1",
                          device_id="d1", capability="lamp.set_power",
                          idempotency_key="k1", digest="hash1", arguments={"on": True})
            self.r = {k: self.c[k] for k in (
                "command_id", "tenant_id", "device_id", "capability", "idempotency_key", "digest")}
            self.r.update(status="EXECUTED", version=2, observed={"lampOn": True})
            self.o = dict(tenant_id="t1", device_id="d1", lampOn=True, version=2)
        def test_success(self):
            self.assertEqual(verify(self.c, self.r, self.o), "CONFIRMED_IN_FAKE_SERVICE")
        def test_denied(self):
            self.c["authorization"] = "DENY"
            self.assertEqual(verify(self.c, self.r, self.o), "DENIED")
        def test_no_receipt(self):
            self.assertEqual(verify(self.c, {}, self.o), "UNKNOWN")
        def test_wrong_tenant(self):
            self.r["tenant_id"] = "other"
            self.assertEqual(verify(self.c, self.r, self.o), "UNKNOWN")
        def test_wrong_device(self):
            self.o["device_id"] = "other"
            self.assertEqual(verify(self.c, self.r, self.o), "UNKNOWN")
        def test_stale_observation(self):
            self.o["version"] = 1
            self.assertEqual(verify(self.c, self.r, self.o), "UNKNOWN")
        def test_wrong_effect(self):
            self.o["lampOn"] = False
            self.assertEqual(verify(self.c, self.r, self.o), "UNKNOWN")
        def test_identity_mismatch(self):
            self.r["command_id"] = "c2"
            self.assertEqual(verify(self.c, self.r, self.o), "UNKNOWN")
        def test_invalid_argument(self):
            self.c["arguments"] = {"on": "true"}
            self.assertEqual(verify(self.c, self.r, self.o), "UNKNOWN")
        def test_no_authority(self):
            self.c.pop("authorization")
            self.assertEqual(verify(self.c, self.r, self.o), "DENIED")

    unittest.main(verbosity=2)
