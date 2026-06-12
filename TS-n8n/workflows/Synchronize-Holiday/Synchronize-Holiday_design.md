# Synchronize-Holiday

## 개요

`Synchronize-Holiday` 는 한국 공휴일 정보를 공공 API에서 가져와 `TsMgmt.dbo.HolidayCalendarKR` 테이블에 동기화하는 워크플로우다.

- 주기: 매년 `1월 1일 03:05 KST`, `7월 1일 03:05 KST`
- 수동 실행: 가능
- 저장 대상: `Microsoft SQL` credential `TsMgmt(DevTest_SQL2022_26)`

## 목적

- 외부 공휴일 API 장애 시 내부 DB를 fallback 소스로 활용할 수 있도록 기준 데이터를 저장
- 공휴일 정보를 6개월마다 주기적으로 갱신
- 기존 로직에서 별도로 관리하던 `근로자의 날`, `창립기념일대휴` 도 함께 유지

## 흐름

1. `Manual Trigger` 또는 `Sync Trigger` 로 시작
2. 현재 KST 기준으로 동기화 대상 연도 계산
3. 공공 공휴일 API 호출
4. 응답을 `holidayDate / holidayName / sourceType / sourceYear` 형식으로 정규화
5. `TsMgmt.dbo.HolidayCalendarKR` 테이블이 없으면 생성
6. `MERGE` 로 업서트 및 동기화 대상 연도 기준 stale row 정리

## 연도 전략

- `1월 실행`: 당해 연도만 동기화
- `7월 실행`: 당해 연도 + 다음 연도 동기화 시도

이렇게 해서 연초에는 당해 데이터만 확정 반영하고, 하반기에는 다음 연도 데이터를 미리 적재하는 구조다.

## 테이블 정의

대상 테이블은 아래 구조로 생성된다.

- `HolidayDate DATE PRIMARY KEY`
- `HolidayName NVARCHAR(100)`
- `IsHoliday BIT`
- `SourceType NVARCHAR(20)`
- `SourceYear INT`
- `CreatedAt DATETIME2(0)`
- `UpdatedAt DATETIME2(0)`

## 비고

- 공공 API가 특정 연도 데이터를 돌려주지 않으면 해당 연도는 강제 삭제하지 않는다.
- `MERGE` 결과로 insert/update/delete 건수를 실행 결과에서 확인할 수 있다.
