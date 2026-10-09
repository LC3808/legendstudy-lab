"""Recover only non-secret Production Math bindings, keeping all activation gates closed.
No secret values are printed, persisted, exported, rotated, or replaced.
Cloudflare's official Wrangler pages/secret implementation uses this partial PATCH.
"""
import argparse,json,os,urllib.request,urllib.error
BASE='https://api.cloudflare.com/client/v4/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/'
PROJECT='legendstudy-lab'
REF='stlhijzpjfgwwdgunlsd'

def api(path,body=None):
 req=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,method='PATCH' if body is not None else 'GET',headers={'Authorization':'Bearer '+os.environ['CLOUDFLARE_API_TOKEN'],'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as res:r=json.load(res)
 if not r.get('success'):raise RuntimeError('CLOUDFLARE_REQUEST_FAILED')
 return r['result']

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 before=api(PROJECT);test=api('legendstudy-lab-math-test')
 prior=before['deployment_configs']['production'];source=test['deployment_configs']['production']['env_vars']
 def value(k):
  item=source[k]
  if item['type']!='plain_text' or not item.get('value'):raise RuntimeError('PUBLIC_SOURCE_UNAVAILABLE')
  return item['value']
 if value('MATH_PROJECT_REF')!=REF or value('MATH_SUPABASE_URL')!='https://'+REF+'.supabase.co' or value('MATH_PROVIDER')!='OPENAI':raise RuntimeError('SOURCE_IDENTITY_CHANGED')
 values={'MATH_PROVIDER':'OPENAI','MATH_PRIMARY_MODEL':value('MATH_PRIMARY_MODEL'),'MATH_ORIGIN':'https://lab.legendstudy.com','MATH_PROJECT_REF':REF,'MATH_SUPABASE_URL':'https://'+REF+'.supabase.co','MATH_SUPABASE_PUBLISHABLE_KEY':value('MATH_SUPABASE_PUBLISHABLE_KEY'),'MATH_ENABLED':'false','MATH_PROVIDER_CALLS_ENABLED':'false','NEXT_PUBLIC_MATH_ENABLED':'false'}
 patch={k:{'type':'plain_text','value':v} for k,v in values.items()}
 print('PLANNED_KEYS',sorted(patch));print('SECRETS_MODIFIED',False);print('ALLOWLIST_COPIED',False)
 if args.apply:
  api(PROJECT,{'deployment_configs':{'production':{'env_vars':patch,'wrangler_config_hash':prior.get('wrangler_config_hash')}}})
  after=api(PROJECT);current=after['deployment_configs']['production']['env_vars']
  if not all(current.get(k)==v for k,v in patch.items()):raise RuntimeError('POSTFLIGHT_MISMATCH')
  if not all(current.get(k)==v for k,v in prior.get('env_vars',{}).items() if k not in patch):raise RuntimeError('UNRELATED_BINDING_CHANGED')
  if after['deployment_configs'].get('preview')!=before['deployment_configs'].get('preview'):raise RuntimeError('PREVIEW_CHANGED')
  print('PRODUCTION_NONSECRET_CONFIG_APPLIED',True);print('UNRELATED_BINDINGS_PRESERVED',True);print('PREVIEW_PRESERVED',True)
 # Fresh user auth check. Credential used only at its existing authorized destination.
 token=os.environ.get('MATH_TEST_ACCESS_TOKEN')
 if token:
  req=urllib.request.Request('https://'+REF+'.supabase.co/auth/v1/user',headers={'apikey':value('MATH_SUPABASE_PUBLISHABLE_KEY'),'Authorization':'Bearer '+token})
  try:
   with urllib.request.urlopen(req,timeout=30) as res:print('TEST_AUTH_HTTP',res.status)
  except urllib.error.HTTPError as e:
   body=json.load(e);print('TEST_AUTH_HTTP',e.code);print('TEST_AUTH_CODE',body.get('code'));print('TEST_AUTH_EXPIRED','expired' in str(body.get('msg','')).lower())
if __name__=='__main__':main()
