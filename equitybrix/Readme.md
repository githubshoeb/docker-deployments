Local Equitybrix Evironment Setup Steps For Docker
======================================================

1. Prerequisites 
---------------------------------------
1) Postgres databse should be up and running.

2) strapi should be up and running.

3) temporal should be up and running
```
Note: To run postgres go to postgres folder and follow the instructions
      To run strapi go to strapi folder and follow the instructions
      To run temporal go to temporal folder and follow the instructions
```
2. pull the latest code
---------------------------------------
Before running the docker compose pull the latest code into equitybrix folder.

1) clone backend code
```
git clone -b dev "backend repo url"
```
2) clone frontend code
```
git clone -b dev "frontend repo url"
```
3) clone sponsor code
```
git clone -b dev "sponsor repo url" 
```


3. Update the env if needed for each app :
----------------------------------------------
There is seperate env files for each app before running docker compose verify the number of keys

4. Installing Equitybrix Locally:
----------------------------------------------
Go into the linux directory and Open command prompt or terminal at equitybrix folder

```
docker compose build --no-cache 
docker compose up -d
docker compose ps
```