# 개발 환경

Container - Docker, Docker-Compose
Application Runtime - NodeJS
Backend Framework – Express
Database – MySQL
NoSql - DynamoDB
Message Broker - RabbitMQ

# 애플리케이션 디펜던시

"amqplib": rabbit mq 연동 라이브러리
"axios": rest 라이브러리
"cors": 크로스도메인 처리 미들웨어
"express": 웹 프레임워크
"mysql2": mysql 연동 라이브러리
"uuid": 고유 아이디 생성 라이브러리

# 디렉토리 구조

database: 도커기반 mysql, dynamoDB, rabbitmq 설치 할 수 있는 docker-compose 파일 디렉토리 db 파일 volumen으로도 사용
lib: 애플리케이션 공통 라이브러리 디렉토리
simulator: 테스트 시뮬레이터 디렉토리
order: order 마이크로서비스
payment: payment 마이크로서비스
product: product 마이크로서비스
user: user 마이크로서비스
delivery: delivery 마이크로서비스

# 서비스 별 적용 DB 및 table 명

user:

- RDB mysql
- database name: user_db
- table name: users
  product:
- RDB mysql
- database name: product_db
- table name: products
  order:
- RDB mysql
- database name: order_db
- table name: orders
  payments:
- NoSQL DynamoDB
- table name: payments
  delivery:
- NoSQL DynamoDB
- table name: delivery

# 실행

1. database 디렉토리에서 docker-compose up -d
2. root 디렉토리에서 docker-compose up
