# equitybrix-backend

Create an `.env` file at /src/.env containing (default settings without) 172.17.0.1 being host of docker runnig NTCL on localhost. Faucet key has no default.

```
NODE_ADDRESS=http://172.17.0.1:11101
EVENT_ADDRESS=http://172.17.0.1:18101/events/main
CHAIN_NAME=casper-net-1
DATABASE_USERNAME=equitybrix
DATABASE_PASSWORD=equitybrix
DATABASE_NAME=equitybrix
DATABASE_HOST=172.17.0.1
DATABASE_PORT=5432
DATABASE_LOGING=false
KMS_ADDRESS=http://172.17.0.1:8080/rpc
FAUCET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
// FILL in here a key of NCTL on localhost
-----END PRIVATE KEY-----"
INSTALL_PAYMENT_AMOUNT=250000000000
ACCOUNT_CREATION_PAYMENT_AMOUNT=2500000000
TRANSFER_PAYMENT_AMOUNT=600000000
```

## Create a docker network

```shell
docker network create casper-equitybrix-network
```

## Build and Run all

```shell
docker compose up --build -d
```

or to see logs

```shell
docker compose up --build
```

## Run all after build

```shell
docker compose up -d
```

## Close servers

to shutdown the middleware

```shell
docker compose down
```

## Api

```bash
GET
http://127.0.0.1:8000/
http://127.0.0.1:8000/peers
http://127.0.0.1:8000/node_status
http://127.0.0.1:8000/install?id_offer=1&id_sponsor=1&name=MyToken&symbol=MT&decimals=18&total_supply=1000000&events_mode=true
http://127.0.0.1:8000/invest?id_offer=1&id_sponsor=1&amount=10&id_investor=1
http://127.0.0.1:8000/balance?id_offer=1&id_sponsor=1
http://127.0.0.1:8000/balance?id_offer=1&id_investor=1
http://127.0.0.1:8000/balance?id_offer=1
http://127.0.0.1:8000/redeem?id_offer=1&id_sponsor=1&amount=5&id_investor=1
```

## Running api container

```shell
docker build -t casper-equitybrix-api . --force-rm
docker container run -t -i --rm -h casper-equitybrix-api -p 8000:8000 casper-equitybrix-api
```

## Running psql container

```shell
docker build -t casper-equitybrix-psql . --force-rm
docker container run -t -i --rm -h casper-equitybrix-psql -p 5432:5432 casper-equitybrix-psql
```

## Running kms container

```shell
docker build -t casper-equitybrix-kms . --force-rm
docker container run -t -i --rm -h casper-equitybrix-kms -p 8080:8080 casper-equitybrix-kms
```

## Running kms-test container

```shell
docker build -t casper-equitybrix-kms-test . --force-rm
docker container run -t -i --rm -h casper-equitybrix-kms-test -p 8080:8080 casper-equitybrix-kms-test
```

## Deployment

Create an `.env.production` file at /src/.env.production containing setting Casper Blockchain network

```
NODE_ADDRESS=https://rpc.integration.casperlabs.io
EVENT_ADDRESS=https://events.integration.casperlabs.io/events/main
CHAIN_NAME=integration-test
```

Build on your local machine and upload every image on host _(please create `/home/equitybrix/db` folder on host for a volume for database files`)_

```shell
docker compose build
docker save -o equitybrix.tar casper-equitybrix-api:latest casper-equitybrix-kms:latest casper-equitybrix-psql:latest
scp equitybrix.tar equitybrix@casper:/home/equitybrix/
scp secret_key.pem equitybrix@casper:/home/equitybrix/
scp docker-compose.production.yml equitybrix@casper:/home/equitybrix/docker-compose.yml
```

```shell
~/equitybrix$ tree -al
.
├── db
├── docker-compose.yml
├── equitybrix.tar
├── secret_key.pem
```

On host

- Load docker images
- Copy docker-compose.yml
- Uncomment section about environment in docker-compose.yml, remove CI/CD kms service
- Copy the faucet key into secret_key.pem to be loaded in environment of the docker container (to be deleted later)

```shell
cd /home/equitybrix/
sudo docker load -i equitybrix.tar
sudo -E FAUCET_PRIVATE_KEY="$(cat ./secret_key.pem)" docker compose up -d
rm secret_key.pem
rm equitybrix.tar
```

_Do not forget to delete the faucet secret_key.pem key in /home/equitybrix/_

## Tests

CI/CD relies on the casper-equitybrix-kms-test but you can run tests against any kms (real or test)

```shell
docker compose down
docker compose -f docker-compose.test.yml up -d
```

### Unit tests

```shell
cd src && npm install && npm run test
```

### Integration tests

```shell
docker compose up -d  // or compose -f docker-compose.test.yml up -d
cd src &&& npm install && npm run test:e2e
```
