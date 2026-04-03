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

- `BASE_URL = https://<백엔드-도메인>`

참고:
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
# posts 도메인 smoke
node perf/k6/run.mjs posts smoke

# letters 도메인 load
node perf/k6/run.mjs letters load

# reports 도메인 stress
node perf/k6/run.mjs reports stress

# notifications 도메인 load
node perf/k6/run.mjs notifications load
```

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

## 7) 운영 안전 수칙
- 실행 전 Slack에 부하테스트 계획 공지
  - 공지 항목: 시작 시간, 대상 도메인, 모드(`smoke/load/stress`), 예상 소요 시간, 실행자
- 먼저 `smoke` 1회 성공 확인 후 `load`, `stress` 진행
- 부하테스트 종료 직후 Slack 스레드 댓글로 `완료했습니다` 남기기
- `reports`/`members`처럼 상태 변경이 있는 도메인은 write 비율을 기본값 이상으로 올리기 전에 팀 합의 후 실행
