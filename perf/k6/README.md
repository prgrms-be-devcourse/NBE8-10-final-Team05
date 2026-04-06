# k6 빠른 실행 (AWS 배포 기준)

이 문서는 아래 전제를 기준으로 작성했습니다.

- AWS EC2에 백엔드 배포 완료
- AWS EC2에 모니터링(Prometheus/Grafana) 배포 완료
- k6는 로컬 PC 또는 별도 러너에서 실행

## 1) 준비
IntelliJ 터미널에서 프로젝트 루트 디렉터리(`maum_on`) 기준으로 실행합니다.

필수:
- `k6` 설치
- `node` 설치
- 백엔드가 `k6` 프로필로 실행 중이어야 함

백엔드 실행 프로필:
- 배포 서버: `SPRING_PROFILES_ACTIVE=prod,k6`

`k6` 프로필이 활성화되면 아래가 자동 처리됩니다.
- 테스트 계정 풀 자동 생성 (일반/관리자)
- 읽기용 시드 데이터 자동 생성 (post/diary/letter)

## 2) 클라우드 실행용 env 파일 생성
```bash
cp perf/env/cloud.env.example perf/env/cloud.env
```

## 3) `perf/env/cloud.env` 필수값 입력
최소 아래 값은 반드시 채우세요.

- `LOADTEST_BASE_URL = http://127.0.0.1:18080` 또는 `http://127.0.0.1:18081`
- `BASE_URL = https://<백엔드-도메인>` (공개 smoke/reset 기준 주소)

참고:
- `LOADTEST_BASE_URL`이 있으면 `node perf/k6/run.mjs ...`는 이 값을 우선 사용합니다.
- 실무 권장 분리:
  - `smoke`: `BASE_URL=https://api...`
  - `load/stress`: `LOADTEST_BASE_URL=http://127.0.0.1:18080` 같은 직접 앱 경로
- 현재 배포 워크플로는 활성 blue/green 슬롯의 직접 대상 정보를 서버의 `/opt/maum-on/runtime/k6-target.env`에 기록합니다.
- 로컬 PC에서 실행할 때는 SSH 터널로 직접 포트를 붙이는 방식을 권장합니다.
```bash
ssh -L 18080:127.0.0.1:18080 -L 18081:127.0.0.1:18081 <ec2-user>@<ec2-host>
ssh <ec2-user>@<ec2-host> 'cat /opt/maum-on/runtime/k6-target.env'
```
- 기본 계정 선택 규칙:
  - 일반: `AUTH_USER_PREFIX-0001@AUTH_USER_DOMAIN`부터 `AUTH_USER_COUNT`개
  - 관리자: `ADMIN_USER_PREFIX-0001@ADMIN_USER_DOMAIN`부터 `ADMIN_USER_COUNT`개
- 비밀번호는 스크립트 내부 고정값(`Maumon!2026#LoadTest`)으로 사용합니다.
- 계정 생성 API를 별도로 호출할 필요가 없습니다(`k6` 프로필 자동 시딩).
- 기본 출력 파일은 `perf/env/cloud.env` 입니다.

## 4) 도메인 실행
형식:
```bash
node perf/k6/run.mjs <도메인> <모드>
```

도메인:
- `auth`
- `posts`
- `letters`
- `diary`
- `members`
- `reports`
- `notifications`

모드:
- `smoke`: 기능 흐름 확인
- `load`: 기준 부하
- `stress`: 한계 부하

시나리오는 도메인별로 자동 세분화되어 실행됩니다.
- 예: `posts`는 feed 조회 / 상세 조회 / writer-light
- 예: `letters`는 받은함 조회 / 보낸함 조회 / writer-light
- 예: `auth`는 token-reader / refresh-session / login-cycle

실행 예시:
```bash
# posts 도메인 load (직접 앱 포트 권장)
LOADTEST_BASE_URL=http://127.0.0.1:18080 \
BASE_URL=https://<백엔드-도메인> \
node perf/k6/run.mjs posts load

# posts 도메인 smoke
BASE_URL=https://<백엔드-도메인> \
node perf/k6/run.mjs posts smoke

# letters 도메인 load
LOADTEST_BASE_URL=http://127.0.0.1:18080 \
BASE_URL=https://<백엔드-도메인> \
node perf/k6/run.mjs letters load

# reports 도메인 stress
LOADTEST_BASE_URL=http://127.0.0.1:18080 \
BASE_URL=https://<백엔드-도메인> \
node perf/k6/run.mjs reports stress

# notifications 도메인 load
LOADTEST_BASE_URL=http://127.0.0.1:18080 \
BASE_URL=https://<백엔드-도메인> \
node perf/k6/run.mjs notifications load
```

모든 `<domain> load` 기본 프로파일:
- `ramping-vus` 기반
- 전체 합계 VU 기준 `0 -> 50 -> 100 -> 0`
- 단계:
  - `2m` ramp-up to `50`
  - `5m` hold `50`
  - `2m` ramp-up to `100`
  - `5m` hold `100`
  - `2m` ramp-down to `0`
- 세그먼트별 target은 각 도메인의 기존 load 비중을 유지한 채 위 총량에 맞춰 축소/확대합니다.

권장 실행 순서:
```bash
node perf/k6/run.mjs auth smoke
node perf/k6/run.mjs posts load
node perf/k6/run.mjs posts stress
```

## 4-1) 테스트 종료 후 정리(reset)
테스트 유저 계정은 유지하고 테스트 데이터만 재시딩합니다.

1) 관리자 토큰 발급
```bash
curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"k6-admin-0001@admin.maumon.local","password":"Maumon!2026#LoadTest"}'
```

2) reset 호출
```bash
curl -X POST "$BASE_URL/api/v1/loadtest/reset" \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

동작:
- 삭제: 런타임 생성 데이터(`k6-post-*`, `k6-diary-*`, `k6-letter-*`, `k6 report sample*`)
- 삭제: 시드 데이터(`[K6-SEED-*]`)
- 재생성: 계정/시드 데이터

## 5) 결과 파일 확인
실행 결과는 로컬 작업 디렉터리에 저장됩니다.

- `perf/k6/<도메인>/result/latest.json`
- `perf/k6/<도메인>/result/<도메인>-<타임스탬프>.json`

예:
- `perf/k6/posts/result/latest.json`

## 6) Grafana에서 확인 (모니터링 서버 기준)
Grafana 대시보드:
- `/grafana/d/maum-on-k6-load-test/maum-on-k6-load-test`

Prometheus remote-write 사용 예시:
```bash
LOADTEST_BASE_URL=http://127.0.0.1:18080 \
BASE_URL=https://<백엔드-도메인> \
K6_PROMETHEUS_RW_SERVER_URL=https://<모니터링-도메인>/prometheus/api/v1/write \
K6_PROMETHEUS_RW_TREND_STATS=p(90),p(95),p(99),avg,min,max \
node perf/k6/run.mjs posts load -- -o experimental-prometheus-rw --tag testid=posts-load-$(date +%Y%m%d%H%M%S)
```

주의:
- `K6_PROMETHEUS_RW_SERVER_URL`은 메트릭 저장 대상입니다.
- 실제 부하 대상 API는 `LOADTEST_BASE_URL` 우선, 없으면 `BASE_URL` 순서로 결정됩니다.
- 운영 HTTPS 프록시 검증은 `smoke`, 장시간 본 부하는 직접 앱 포트 기준으로 분리하세요.

## 7) 운영 안전 수칙
- 실행 전 Slack에 부하테스트 계획 공지
  - 공지 항목: 시작 시간, 대상 도메인, 모드(`smoke/load/stress`), 예상 소요 시간, 실행자
- 먼저 `smoke` 1회 성공 확인 후 `load`, `stress` 진행
- 부하테스트 종료 직후 Slack 스레드 댓글로 `완료했습니다` 남기기
- `reports`/`members`처럼 상태 변경이 있는 도메인은 write 비율을 기본값 이상으로 올리기 전에 팀 합의 후 실행
