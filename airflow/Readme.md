Local Airflow Evironment Setup Steps For Docker
======================================================
1. Installing Airflow Locally:
----------------------------------------------
Go into the linux directory and Open command prompt or terminal at airflow folder
```
docker compose build --no-cache 
docker compose up -d
docker compose ps
```

2. Installing git sync containers
-------------------------------------------
NOTE: Update Github credentials in docker-compose.git-sync.yaml file then run below commands
```
docker compose -f docker-compose.git-sync.yaml up -d
docker compose ps
```
