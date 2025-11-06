Local laravel-platform-webhook Evironment Setup Steps For Docker
======================================================

1. Prerequisites 
---------------------------------------
1) Postgres databse should be up and running.


Note: To run postgres go to postgres folder and follow the instructions

2. pull the latest code
---------------------------------------
Before running the docker compose pull the latest code into laravel-platform-webhook folder.

1) clone laravel code

git clone -b dev  "laravel repo url"


3. Installing laravel-platform-webhook Locally:
----------------------------------------------
Go into the linux directory and Open command prompt or terminal at Laravel-platform-webhook folder
```
docker compose build --no-cache 
docker compose up -d
docker compose ps
```