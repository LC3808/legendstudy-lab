import base64,importlib.util,json,unittest
from pathlib import Path
from unittest.mock import patch
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
spec=importlib.util.spec_from_file_location('signer',Path(__file__).with_name('prepare-math-worker-signer.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def dec(x):return base64.urlsafe_b64decode(x+'===')
class Tests(unittest.TestCase):
 def test_empty_successful_management_response(self):
  from unittest.mock import MagicMock
  response=MagicMock();response.__enter__.return_value.read.return_value=b''
  with patch.dict(m.os.environ,{'TEST_CREDENTIAL':'synthetic'}),patch.object(m.urllib.request,'urlopen',return_value=response):
   self.assertIsNone(m.request('https://example.invalid/secret','TEST_CREDENTIAL','POST',[]))
 def test_seven_day_role_signature_and_tamper(self):
  key,j=m.generate()
  for role,_ in m.ROLES.values():
   jwt=m.token(key,j['kid'],role,1000);h,p,s=jwt.split('.');claims=json.loads(dec(p));signature=dec(s)
   self.assertEqual(claims['exp']-claims['iat'],604800);self.assertEqual(claims['role'],role);self.assertNotIn('sub',claims)
   der=encode_dss_signature(int.from_bytes(signature[:32],'big'),int.from_bytes(signature[32:],'big'))
   key.public_key().verify(der,(h+'.'+p).encode(),ec.ECDSA(hashes.SHA256()))
   with self.assertRaises(InvalidSignature):key.public_key().verify(der,(h+'.'+m.obj({**claims,'role':'service_role'})).encode(),ec.ECDSA(hashes.SHA256()))
 def test_privileged_or_student_role_not_issued(self):
  k,j=m.generate()
  for role in ['service_role','authenticated','postgres','math_executor']:
   with self.assertRaises(ValueError):m.token(k,j['kid'],role,1000)
 def test_capacity_blocks_before_any_management_mutation(self):
  ks=[{'id':'a','status':'in_use','algorithm':'ES256'},{'id':'b','status':'standby'}, {'id':'c','status':'previously_used'},{'id':'d','status':'previously_used'}]
  with patch.object(m,'keys',return_value=ks),patch.object(m,'cf',return_value={'deployment_configs':{'production':{'env_vars':{}}}}),patch.object(m,'sb') as write,patch('sys.argv',['signer','--apply']):
   with self.assertRaisesRegex(RuntimeError,'SIGNING_CAPACITY_BLOCKED'):m.main()
   write.assert_not_called()
 def test_import_failure_restores_existing_standby_without_current_change(self):
  keys=[{'id':'active','status':'in_use','algorithm':'ES256'},{'id':'standby','status':'standby','algorithm':'ES256'}];calls=[]
  env={k:{'value':'false'} for k in ['MATH_ENABLED','MATH_PROVIDER_CALLS_ENABLED','NEXT_PUBLIC_MATH_ENABLED']}
  def sb(path,method='GET',body=None):
   if path=='/secrets':return []
   if method=='POST':raise RuntimeError('IMPORT_FAILED')
   raise AssertionError('unexpected request')
  def status(k,s):
   self.assertNotEqual(k,'active');calls.append((k,s));next(x for x in keys if x['id']==k)['status']=s
  import copy
  with patch.object(m,'keys',side_effect=lambda:copy.deepcopy(keys)),patch.object(m,'sb',side_effect=sb),patch.object(m,'status',side_effect=status),patch.object(m,'cf',return_value={'deployment_configs':{'production':{'env_vars':env}}}),patch('sys.argv',['signer','--apply']):
   with self.assertRaisesRegex(RuntimeError,'IMPORT_FAILED'):m.main()
  self.assertEqual(calls,[('standby','previously_used'),('standby','standby')]);self.assertEqual(keys[0]['status'],'in_use')
if __name__=='__main__':unittest.main()
