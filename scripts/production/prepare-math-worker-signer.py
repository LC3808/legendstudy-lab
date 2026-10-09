"""Owner-authorized dedicated-role ES256 recovery; never uses the exposed Legacy key.
Private material only goes to Supabase's encrypted secret store/signing-key import.
Current Auth key never changes. Existing standby is restored. No key is revoked/deleted.
Default: read-only plan. --apply imports a key, proves RPC role boundaries without
reading or mutating student data, then installs seven-day Cloudflare worker JWTs.
"""
import argparse,base64,json,os,re,time,urllib.request,urllib.error,urllib.parse,uuid
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature,encode_dss_signature
REF='stlhijzpjfgwwdgunlsd'
SB='https://api.supabase.com/v1/projects/'+REF
CF='https://api.cloudflare.com/client/v4/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab'
SECRET='MATH_WORKER_SIGNING_JWK_V1'  # Earlier unimported attempt backups were verified and removed.
TTL=7*24*60*60
ROLES={'MATH_EXTRACTION_WORKER_JWT':('math_extraction_worker','math_extraction'), 'MATH_EVALUATION_WORKER_JWT':('math_evaluation_worker','math_evaluation')}

def b64(b):return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
def obj(v):return b64(json.dumps(v,separators=(',',':')).encode())
def request(url,credential,method='GET',body=None):
 headers={'Authorization':'Bearer '+os.environ[credential],'Content-Type':'application/json'}
 req=urllib.request.Request(url,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as r:
   raw=r.read();return json.loads(raw) if raw else None
 except urllib.error.HTTPError as e:
  # Only sanitized error text; never print request payload/private JWK/token.
  try:
   error=json.load(e);detail=str(error.get('message','')) if isinstance(error,dict) else ''
  except Exception:detail=''
  detail=re.sub(r'[A-Za-z0-9_+/=-]{24,}','[REDACTED]',detail)[:240]
  raise RuntimeError('MANAGEMENT_HTTP_'+str(e.code)+' '+method+' '+urllib.parse.urlsplit(url).path+' '+detail) from None

def sb(path,method='GET',body=None):return request(SB+path,'SUPABASE_ACCESS_TOKEN',method,body)
def cf(method='GET',body=None):
 r=request(CF,'CLOUDFLARE_API_TOKEN',method,body)
 if not r.get('success'):raise RuntimeError('CLOUDFLARE_FAILED')
 return r['result']
def keys():return sb('/config/auth/signing-keys')['keys']
def status(k,s):
 if next(x for x in keys() if x['id']==k)['status']!=s:sb('/config/auth/signing-keys/'+k,'PATCH',{'status':s})
def generate():
 key=ec.generate_private_key(ec.SECP256R1());n=key.private_numbers();p=n.public_numbers
 jwk={'kty':'EC','crv':'P-256','alg':'ES256','use':'sig','key_ops':['sign','verify'],'ext':True,'kid':str(uuid.uuid4()),'x':b64(p.x.to_bytes(32,'big')),'y':b64(p.y.to_bytes(32,'big')),'d':b64(n.private_value.to_bytes(32,'big'))}
 return key,jwk

def token(key,kid,role,now):
 if role not in [v[0] for v in ROLES.values()]:raise ValueError('ROLE_NOT_ALLOWED')
 message=obj({'alg':'ES256','typ':'JWT','kid':kid})+'.'+obj({'iss':'supabase','role':role,'iat':now,'exp':now+TTL})
 der=key.sign(message.encode(),ec.ECDSA(hashes.SHA256()));r,s=decode_dss_signature(der)
 return message+'.'+b64(r.to_bytes(32,'big')+s.to_bytes(32,'big'))

def probe(jwt,rpc,publishable):
 # Deliberately invalid DTO raises22023 before the function's case/action; no claims,
 # no student identifiers, no evaluations, and no ledger writes are attempted.
 req=urllib.request.Request('https://'+REF+'.supabase.co/rest/v1/rpc/'+rpc,data=b'{"p_request":null}',headers={'apikey':publishable,'Authorization':'Bearer '+jwt,'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(req,timeout=30) as r:return (r.status,'UNEXPECTED_SUCCESS')
 except urllib.error.HTTPError as e:
  try:code=json.load(e).get('code')
  except Exception:code='NON_JSON'
  return(e.code,code)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 before=keys();active=[k for k in before if k['status']=='in_use'];standby=[k for k in before if k['status']=='standby'];project=cf();env=project['deployment_configs']['production']['env_vars']
 if len(active)!=1 or len(standby)!=1:raise RuntimeError('KEY_TOPOLOGY_CHANGED')
 if active[0]['algorithm']!='ES256':raise RuntimeError('ACTIVE_ALGORITHM_CHANGED')
 # Hosted API rejects creation when moving standby makes three previous keys.
 # Do not mutate/create backups until a separately reviewed retirement plan resolves it.
 if sum(k['status']=='previously_used' for k in before)>=2:raise RuntimeError('SIGNING_CAPACITY_BLOCKED_EXISTING_KEY_RETIREMENT_REQUIRES_REVIEW')
 if any(env.get(k,{}).get('value')!='false' for k in ['MATH_ENABLED','MATH_PROVIDER_CALLS_ENABLED','NEXT_PUBLIC_MATH_ENABLED']):raise RuntimeError('GATES_NOT_CLOSED')
 if any(k in env for k in ROLES):raise RuntimeError('EXISTING_WORKER_BINDING_DO_NOT_OVERWRITE')
 if any(s.get('name')==SECRET for s in sb('/secrets')):raise RuntimeError('SIGNER_ALREADY_EXISTS_RESUME_REQUIRED')
 print('PREFLIGHT_PASS');print('CURRENT_AUTH_KEY_UNCHANGED_PLAN',True);print('TTL_DAYS',7)
 if not args.apply:return
 key,jwk=generate()
 # Back up BEFORE importing so a transient response loss never loses the signer.
 sb('/secrets','POST',[{'name':SECRET,'value':json.dumps(jwk,separators=(',',':'))}])
 print('SIGNER_ENCRYPTED_BACKUP_STORED',True)
 original=standby[0]['id'];new_id=None
 try:
  # Move only the unused standby to still-trusted previous; never touch in_use.
  status(original,'previously_used')
  sb('/config/auth/signing-keys','POST',{'algorithm':'ES256','status':'standby','private_jwk':jwk})
  fresh=[k for k in keys() if k['id'] not in {x['id'] for x in before}]
  if len(fresh)!=1:raise RuntimeError('IMPORT_IDENTITY_UNCERTAIN')
  imported=fresh[0];new_id=imported['id']
  if any(imported['public_jwk'].get(k)!=jwk[k] for k in ['x','y']):raise RuntimeError('IMPORTED_PUBLIC_KEY_MISMATCH')
  status(new_id,'previously_used')
 finally:
  # If POST completed but its response was lost, identify OUR imported public key only.
  current=keys()
  for k in current:
   if k['id'] not in {x['id'] for x in before} and k.get('public_jwk',{}).get('x')==jwk['x'] and k['status']=='standby':status(k['id'],'previously_used')
  status(original,'standby')
 after=keys();states={k['id']:k['status'] for k in after}
 if any(states.get(k['id'])!=k['status'] for k in before):raise RuntimeError('ORIGINAL_KEY_STATE_NOT_RESTORED')
 imported=next(k for k in after if k['id']==new_id);kid=imported['public_jwk']['kid'];now=int(time.time())
 tokens={name:token(key,kid,role,now) for name,(role,rpc) in ROLES.items()}
 print('ORIGINAL_KEYS_PRESERVED',True);print('NEW_KEY_ID',new_id)
 for name,(_,rpc) in ROLES.items():
  own=probe(tokens[name],rpc,env['MATH_SUPABASE_PUBLISHABLE_KEY']['value']);other='math_evaluation' if rpc=='math_extraction' else 'math_extraction';cross=probe(tokens[name],other,env['MATH_SUPABASE_PUBLISHABLE_KEY']['value'])
  print('ROLE_PROBE',rpc,'own',own,'cross',cross)
  if own!=(400,'22023') or cross not in [(403,'42501'),(401,'42501')]:raise RuntimeError('JWT_ROLE_BOUNDARY_NOT_VERIFIED_NO_DEPLOY')
 patch={name:{'type':'secret_text','value':v} for name,v in tokens.items()}
 cf('PATCH',{'deployment_configs':{'production':{'env_vars':patch,'wrangler_config_hash':project['deployment_configs']['production'].get('wrangler_config_hash')}}})
 final=cf();f=final['deployment_configs']['production']['env_vars']
 if any(f.get(k,{}).get('type')!='secret_text' for k in ROLES):raise RuntimeError('WORKER_BINDING_MISSING')
 if any(f.get(k)!=v for k,v in env.items()):raise RuntimeError('UNRELATED_BINDING_CHANGED')
 if final['deployment_configs'].get('preview')!=project['deployment_configs'].get('preview'):raise RuntimeError('PREVIEW_CHANGED')
 print('WORKER_SECRETS_CONNECTED',True);print('EXPIRES_AT_UNIX',now+TTL);print('EVALUATION_SWITCH','OFF')

if __name__=='__main__':
 try:main()
 except Exception as e:raise SystemExit('RECOVERY_STOP: '+str(e)) from None
