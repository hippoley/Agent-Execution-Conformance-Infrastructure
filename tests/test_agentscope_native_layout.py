"""Offline source-structure acceptance gate for pinned AgentScope v2.0.10.

Does not claim a live SDK service or model/ESP32 success.
"""
from pathlib import Path
import ast
import unittest

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"vendor/agentscope"
FILES={
 "service_factory":BASE/"src/agentscope/app/_app.py",
 "sop_router":BASE/"src/agentscope/app/_router/_sop.py",
 "health_router":BASE/"src/agentscope/app/_router/_health.py",
 "example":BASE/"examples/agent_service/main.py",
 "native":ROOT/"services/agentscope_native/main.py",
}

class NativeBaselineTest(unittest.TestCase):
 def test_sources_present_and_parse(self):
  for name,path in FILES.items():
   with self.subTest(name=name):
    self.assertTrue(path.is_file(),f"Missing source {path}")
    ast.parse(path.read_text(encoding="utf-8"),filename=str(path))
 def test_native_is_offline_and_local_only(self):
  src=FILES["native"].read_text()
  self.assertIn('host="127.0.0.1"',src)
  self.assertIn("default_mcps=[]",src)
  self.assertIn("enable_scheduler=False",src)
  self.assertIn("enable_channel_worker=False",src)
  self.assertNotIn("CORSMiddleware",src)
 def test_official_routes_exist(self):
  sop=FILES["sop_router"].read_text()
  health=FILES["health_router"].read_text()
  self.assertIn('prefix="/sop"',sop)
  self.assertIn('"/schema"',sop)
  self.assertIn('"/runs"',sop)
  self.assertIn('"/health"',health)
 def test_native_uses_official_app_factory(self):
  s=FILES["native"].read_text()
  self.assertIn("from agentscope.app import create_app",s)
  self.assertIn("app = create_app(",s)
  self.assertNotIn("from fastapi import FastAPI",s)

if __name__=="__main__":
 unittest.main()
