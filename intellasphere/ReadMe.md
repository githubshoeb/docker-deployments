Local Intellasphere Evironment Setup Steps For Docker
======================================================

1. Prerequisites :
----------------------------------------------
1) JDK 8 should be installed 

```
java -version

openjdk version "1.8.0_432"
OpenJDK Runtime Environment (build 1.8.0_432-8u432-ga~us1-0ubuntu2~22.04-ga)
OpenJDK 64-Bit Server VM (build 25.432-bga, mixed mode)
```
2) Docker should be installed 

```
docker --version
Docker version 27.3.1, build ce12230
```

3) docker compose should be installed

```
docker compose version

Docker Compose version v2.29.7
```

2. clone required intellasphere repos :
---------------------------------------------- 

Go into the linux directory and Open command prompt or terminal at intellasphere folder
clone the JAVA project repo

   ```
   git clone "JAVA repo url"

   git checkout intella-dev

   git clone "Iframely repo url"

   ```

3. build the JAVA code :
----------------------------------------------  

Open new terminal at "JAVA/IS" where pom.xml file is there and build the codeusing below command

```
mvn sass:update-stylesheets package -DskipTests
```

4. Update all the required environment variables
-----------------------------------------------------

Compair "application.local.properties" for number of keys and present at path "JAVA/IS/src/main/resources". Update the number of keys if needed in ".env.app" and ".env.api" files present in "intellasphere" directory

5. Running infra components for intellasphere:
---------------------------------------

Go into the linux directory and Open command prompt or terminal at intellasphere

```
docker compose -f docker-compose-infra.yaml build --no-cache

docker compose -f docker-compose-infra.yaml up -d

docker compose ps
```

Note : All containers should be up and running ,if mongo db is failing due to permission issue run below commands 

```
docker compose -f docker-compose-infra.yaml down

sudo chown -R 1001:0 ./mongo/data 

docker compose -f docker-compose-infra.yaml up -d

```

6. Importing Mysql Schema In Database:
---------------------------------------
```
docker exec -d mariadb mysql -u root -e "create database es;"
docker exec -d mariadb mysql -u root -e "grant all privileges on *.* to 'root'@'%' identified by password '' with grant option;"
docker exec -d mariadb mysql -u root -e "FLUSH PRIVILEGES;"
```

Go to "JAVA/IS/scripts/db/Mysql" , open terminal and run below commands 

```
cat es_Schema.sql | docker exec -i mariadb mysql -u root  es

cat activiti-ddl.sql | docker exec -i mariadb mysql -u root  es
```

7. Restoring mongodb data in database:
---------------------------------------

Go into the linux directory and Open command prompt or terminal at intellasphere ,in case of authentication error follow note below


```
docker exec -i mongo mongorestore -u root -p admin1234 --authenticationDatabase admin -d profile --drop /scripts/db/profile/
docker exec -i mongo mongorestore -u root -p admin1234 --authenticationDatabase admin -d activity --drop /scripts/db/activity 
docker exec -i mongo mongorestore -u root -p admin1234 --authenticationDatabase admin -d metrics --drop /scripts/db/metrics 
docker exec -i mongo mongorestore -u root -p admin1234 --authenticationDatabase admin -d polling --drop /scripts/db/polling 
docker exec -i mongo mongorestore -u root -p admin1234 --authenticationDatabase admin -d crm --drop /scripts/db/crm
docker exec -i mongo mongorestore -u root -p admin1234 --authenticationDatabase admin -d affinityPage --drop /scripts/db/affinityPage

```
NOTE: create admin user by running below commands.Shell into mongodb container and run below commands

```
mongosh
```
```
use admin
```
```
db.createUser({
  user: "root",
  pwd: "admin1234",
  roles: [
    { role: "backup", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "readAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    { role: "restore", db: "admin" },
    { role: "clusterMonitor", db: "admin" }
  ]
});
```

8. Installing Intellasphere Services Locally:
----------------------------------------------

Go into the linux directory and Open command prompt or terminal at intellasphere

```
docker compose build --no-cache

docker compose up -d

docker compose ps

```



*********************************************
extra commands 
---------------------------------
Commands to update individual collections

```
Copy latest db scripts ,run below command

$ docker cp db mongo:/root/

Shell into mongo container using below command 

$ docker exec -it mongo /bin/bash

Drop the existing collection

$ use <db name>
$ db.<db name>.drop

To import collection run below command

mongoimport --username your_username --password your_password --authenticationDatabase admin --db <db name> --collection <collection name> --file <collection name>.json --jsonArray


$ docker ps          ----> checking process

$ docker logs -f <container name>  ----> for checking logs of service container named ( mysql , mongo , pusher-app , rabbitmq , redis , manet , thumbor )

 ctrl+c for exiting from logs
```


9. Intellasphere component URLs
======================================================

```
http://localhost:8891     ------------------ Manet url

http://localhost:8061     ------------------ Iframely url

http://localhost:40000     ------------------ pusher url

http://localhost:8888     ------------------ thumbor url

http://localhost:8090     ------------------ intellasphere app  url

http://localhost:9090     ------------------ intellasphere api  url

```
