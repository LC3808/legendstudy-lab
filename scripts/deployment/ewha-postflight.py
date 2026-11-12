"""Read-only production verification for the 21-exam / 63-question Ewha release.

capture-baseline: public HTTP + existing Cloudflare configuration snapshot only.
verify: compare deployment, exact scopes, existing catalog/assets, anonymous PDF
        denial and local native DTO identities. Never POST, PATCH or Provider call.
Optional EWHA_READONLY_TEST_ACCESS_TOKEN only enables authenticated GET of the
existing student-pdfs endpoint; absence remains NOT TESTED, never inferred PASS.
"""
from __future__ import annotations
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import datetime
import hashlib
import json
import os
from pathlib import Path
import tomllib
import urllib.error
import urllib.request

WEB = Path(__file__).resolve().parents[2]
APP_DEFAULT = Path('/Users/woojinchang/.codex/worktrees/app-ga4-usage-20261105/legendstudy-service-app-20261022')
ORIGIN = 'https://lab.legendstudy.com'
SUPABASE = 'https://stlhijzpjfgwwdgunlsd.supabase.co'
CF_BASE = 'https://api.cloudflare.com/client/v4/accounts/b9d221b20fdf8b9a9a8df0971a6b2347/pages/projects/legendstudy-lab'

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def load(path):
    return json.loads(Path(path).read_text())


def save(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def http(url, headers=None, limit=8_000_000):
    request = urllib.request.Request(url, method='GET', headers={
        'User-Agent': 'LegendStudy-Ewha-Readonly-Verification/1.0', **(headers or {})})
    try:
        with urllib.request.build_opener(NoRedirect).open(request, timeout=45) as response:
            return response.status, response.read(limit), dict(response.headers)
    except urllib.error.HTTPError as error:
        return error.code, error.read(limit), dict(error.headers)


def cf_get(route):
    token = os.environ.get('CLOUDFLARE_API_TOKEN')
    if not token:
        token = tomllib.loads((Path.home() / 'Library/Preferences/.wrangler/config/default.toml').read_text())['oauth_token']
    status, body, _ = http(CF_BASE + route, {'Authorization': 'Bearer ' + token})
    require(status == 200, 'Cloudflare read failed: ' + str(status))
    data = json.loads(body)
    require(data.get('success') is True, 'Cloudflare read was unsuccessful')
    return data['result']


def public_http():
    observations = []
    catalog = None
    for path, expected in [('/essay-lab/', 200), ('/api/essay/catalog', 200),
                           ('/api/essay/student-pdfs', 401), ('/api/essay/public-service-status', 401),
                           ('/login/', 200)]:
        status, body, _ = http(ORIGIN + path)
        require(status == expected, f'Unexpected anonymous HTTP status: {path} {status}')
        observations.append({'path': path, 'status': status})
        if path == '/api/essay/catalog':
            catalog = json.loads(body)
    return observations, catalog


def decode_scope(value):
    if not value.startswith('uuid64:'):
        return [entry for entry in value.split(',') if entry]
    raw = base64.b64decode(value[7:], validate=True)
    require(len(raw) % 16 == 0, 'Malformed compact scope')
    result = []
    for i in range(0, len(raw), 16):
        h = raw[i:i+16].hex()
        result.append(f'{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}')
    return result


def local_contract(candidate):
    exams = load(WEB / 'scripts/deployment/ewha-public-scope.json')['exams']
    source_scope = load(WEB / 'scripts/deployment/ewha-pdf-scope.json')
    originals = load(candidate / 'pdf-originals.json')
    mappings = load(candidate / 'student-pdf-mappings.json')
    expected_ids = [q for exam in exams for q in exam['questionIds']]
    require(len(exams) == 21 and len(expected_ids) == len(set(expected_ids)) == 63, 'Expected exact Ewha 21/63 scope')
    require(len(originals) == 21 and len(mappings) == 63, 'Expected exact student PDF 21/63 scope')
    require(len([q for exam in exams if exam['mode'] == 'math' for q in exam['questionIds']]) == 27, 'Expected Math 27')
    require(len([q for exam in exams if exam['mode'] == 'essay' for q in exam['questionIds']]) == 36, 'Expected Essay 36')
    require(set(expected_ids).isdisjoint(source_scope['excludedMockQuestionIds']), 'Mock question entered release')
    assets = {entry['assetId']: entry for entry in originals}
    solutions = {entry['solutionSha256'] for entry in source_scope['exams']}
    require(set(assets).isdisjoint(solutions), 'Solution PDF entered student assets')
    require({m['questionId'] for m in mappings} == set(expected_ids), 'Native question DTO mismatch')
    for row in mappings:
        asset = assets[row['assetId']]
        require(row['examId'] == asset['examId'] and row['questionId'] in asset['questionIds'], 'Native exam/question pair mismatch')
        require(row['pageCount'] == asset['pageCount'] and 1 <= row['startPage'] <= row['pageCount'], 'Native page mapping mismatch')
        require(all(row[key] == expected for key, expected in [('storageRead', 'APPROVED'), ('studentDisplay', 'APPROVED'), ('verification', 'VERIFIED')]), 'Native PDF approval gate mismatch')
    return exams, source_scope, originals, mappings


def capture(backup, candidate):
    exams, _, _, _ = local_contract(candidate)
    current = cf_get('')
    before = load(backup / 'project.private.json')
    require(current['canonical_deployment']['id'] == before['canonical_deployment']['id'], 'Deployment changed before baseline capture')
    require(current['deployment_configs'] == before['deployment_configs'], 'Configuration changed before baseline capture')
    observations, catalog = public_http()
    new_ids = {e['examId'] for e in exams}
    require(not any(e.get('dbExamId') in new_ids for e in catalog['exams']), 'Ewha admission IDs already present: baseline too late')
    save(backup / 'public-catalog-before.private.json', catalog)
    result = {'status': 'BASELINE_CAPTURED', 'deployment': current['canonical_deployment']['id'],
              'catalogExams': len(catalog['exams']), 'catalogQuestions': sum(len(e['questions']) for e in catalog['exams']), 'http': observations}
    save(backup / 'public-http-before.json', result)
    print(json.dumps(result, ensure_ascii=False))


def verify(backup, candidate):
    exams, source_scope, originals, mappings = local_contract(candidate)
    before = load(backup / 'project.private.json')
    deployed = load(backup / 'production-deployment.json')
    expected = load(backup / 'configured-project.private.json')
    current = cf_get('')
    deployment = current['canonical_deployment']
    require(deployment['id'] == deployed['id'], 'Canonical deployment differs from release receipt')
    require(deployment['latest_stage']['status'] == 'success', 'Deployment is not successful')
    require(current['deployment_configs'] == expected['deployment_configs'], 'Deployment configuration drift')
    # Independently reconstruct the only approved configuration change.
    expected_config = json.loads(json.dumps(before['deployment_configs']))
    counts = {}
    for name in ['ESSAY_PUBLIC_EXAMS', 'ESSAY_BETA_EXPANSION_EXAMS', 'MATH_PUBLIC_LEAVES']:
        old = before['deployment_configs']['production']['env_vars'][name]
        new = current['deployment_configs']['production']['env_vars'][name]
        require(old['type'] == new['type'] == 'plain_text', 'Scope binding type changed')
        old_ids, new_ids = decode_scope(old['value']), decode_scope(new['value'])
        additions = [leaf for exam in exams for leaf in exam['mathQuestions'].values()] if name == 'MATH_PUBLIC_LEAVES' else [exam['examId'] for exam in exams]
        require(len(new_ids) == len(set(new_ids)) and new_ids == old_ids + additions, 'Scope differs from exact append: ' + name)
        expected_config['production']['env_vars'][name] = new
        counts[name] = [len(old_ids), len(new_ids)]
    require(current['deployment_configs'] == expected_config, 'Unapproved config / binding / Preview change')
    live_files = cf_get('/deployments/' + deployment['id'] + '/files')['files']
    require(live_files == load(backup / 'manifest.json'), 'Deployed asset manifest differs from plan')
    prior = load(backup / 'files.private.json')['result']['files']
    preserved = [p for p in prior if not (p.startswith('/essay-lab/') or p == '/essay-lab.txt')]
    require(all(live_files.get(p) == prior[p] for p in preserved), 'Existing non-Essay static asset changed')
    functions = cf_get('/deployments/' + deployment['id'] + '/functions')
    require(json.loads(functions['config']) == load(backup / 'route-config.json'), 'Functions routing differs from compiled plan')
    require(json.loads(functions['config']) == json.loads(load(backup / 'functions.private.json')['result']['config']), 'Existing Functions route changed')
    observations, catalog = public_http()
    old_catalog = load(backup / 'public-catalog-before.private.json')
    current_by_key = {e['key']: e for e in catalog['exams']}
    require(len(current_by_key) == len(catalog['exams']), 'Duplicate source key in public catalog')
    for old_exam in old_catalog['exams']:
        require(current_by_key.get(old_exam['key']) == old_exam, 'Existing public exam metadata changed: ' + old_exam['key'])
    require(catalog['universities'] == old_catalog['universities'], 'Existing university metadata changed')
    for exam in exams:
        actual = [e for e in catalog['exams'] if e.get('dbExamId') == exam['examId']]
        require(len(actual) == 1, 'New public exam not unique or missing: ' + exam['examId'])
        row = actual[0]
        require(row['universityId'] == exam['universityId'], 'Public university ID mismatch')
        require([q['dbQuestionId'] for q in row['questions']] == exam['questionIds'], 'Public Registry question order mismatch')
        require(all(q['inputMode'] == ('image' if exam['mode'] == 'math' else 'text') for q in row['questions']), 'Existing answer-input contract mismatch')
    require(len(catalog['exams']) == len(old_catalog['exams']) + 21, 'Unexpected catalog expansion')
    public_key = before['deployment_configs']['production']['env_vars']['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']['value']
    def denied_pdf(asset):
        results = []
        for route, headers in [('public', {}), ('authenticated', {'apikey': public_key})]:
            status, body, _ = http(SUPABASE + '/storage/v1/object/' + route + '/' + asset['bucket'] + '/' + asset['objectName'], headers, limit=2048)
            require(status in (400, 401, 403, 404) and not body.startswith(b'%PDF-'), 'Anonymous PDF unexpectedly available: ' + asset['assetId'])
            results.append({'assetId': asset['assetId'], 'route': route, 'status': status})
        return results
    with ThreadPoolExecutor(max_workers=4) as pool:
        pdf_denials = [row for result in pool.map(denied_pdf, originals) for row in result]
    authenticated = {'status': 'NOT TESTED', 'reason': 'No existing test-account access token; no login or Provider request performed'}
    test_access_token = os.environ.get('EWHA_READONLY_TEST_ACCESS_TOKEN')
    if test_access_token:
        status, body, _ = http(ORIGIN + '/api/essay/student-pdfs', {'Authorization': 'Bearer ' + test_access_token})
        require(status == 200, 'Authenticated student PDF metadata unavailable')
        manifest = json.loads(body)
        require(manifest.get('version') == 'essay-student-pdfs-v1', 'Native manifest version drift')
        live = {r['questionId']: r for r in manifest['questions']}
        for row in mappings:
            actual = live.get(row['questionId'])
            require(actual is not None and all(actual.get(k) == row[k] for k in ['examId', 'assetId', 'pageCount', 'startPage', 'verification', 'studentDisplay']), 'Live native PDF DTO mismatch')
            require(actual.get('sha256') == row['assetId'] and actual.get('kind') == 'student_question' and actual.get('bucket') == 'essay-material-originals', 'Live native asset identity mismatch')
        authenticated = {'status': 'PASS', 'newQuestionDtos': 63, 'readOnlyGetOnly': True}
    save(backup / 'public-catalog.private.json', catalog)
    save(backup / 'postflight-project.private.json', current)
    receipt = {'status': 'PUBLIC_CONNECTION_CHECK_PASS', 'checked_at_kst': datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat(),
        'deployment': deployment['id'], 'source': deployment['deployment_trigger']['metadata']['commit_hash'], 'exams': 21, 'questions': 63,
        'mathQuestions': 27, 'essayQuestions': 36, 'excludedMockQuestions': 24,
        'preservedExistingPublicExams': len(old_catalog['exams']), 'preservedNonEssayStaticAssets': len(preserved),
        'configurationExact': True, 'functionRoutesExact': True, 'scopeCounts': counts, 'http': observations,
        'anonymousPdfChecks': pdf_denials, 'localAppDtoIdentities': {'status': 'PASS', 'questions': 63, 'pdfAssets': 21},
        'authenticatedStudentPdfManifest': authenticated, 'browserUI': 'NOT TESTED', 'iPhone': 'NOT TESTED', 'Android': 'NOT TESTED',
        'loggedInSubmitResultRewrite': 'NOT TESTED', 'providerCalls': 0, 'actualAIQuality': 'NOT TESTED_OWNER'}
    save(candidate / 'web-production-receipt.json', receipt)
    print(json.dumps({k: v for k, v in receipt.items() if k != 'anonymousPdfChecks'}, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['capture-baseline', 'verify', 'check-local'])
    parser.add_argument('--backup', type=Path, default=Path('/private/tmp/ls-ewha-public-20261112'))
    parser.add_argument('--app', type=Path, default=APP_DEFAULT)
    args = parser.parse_args()
    candidate = args.app / 'supabase/candidates/ewha_public_20261112'
    if args.mode == 'capture-baseline':
        capture(args.backup, candidate)
    elif args.mode == 'verify':
        verify(args.backup, candidate)
    else:
        local_contract(candidate)
        print(json.dumps({'status': 'LOCAL_CONTRACT_PASS', 'exams': 21, 'questions': 63, 'pdfAssets': 21, 'networkCalls': 0}))


if __name__ == '__main__':
    main()
