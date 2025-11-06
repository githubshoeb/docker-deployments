Local confluent Evironment Setup Steps For Docker
======================================================
1. Installing confluent Locally:
----------------------------------------------
Go into the linux directory and Open command prompt or terminal at confluent folder
```
docker compose build --no-cache 
docker compose up -d
docker compose ps
```

2. Accessing confluent UI:
----------------------------------------------
1. you access the conflunet using   "http://localhost:9021"

2. if the state of any component isn’t Up, run the docker-compose up -d command again, or try docker-compose restart service name , for example:
 
    docker-compose restart control-center