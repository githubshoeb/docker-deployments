FROM ubuntu:18.04

ENV DEBIAN_FRONTEND noninteractive
ENV phpconfile /etc/php/7.2/apache2/php.ini

RUN apt update -y && apt upgrade -y && \
    apt-get install --no-install-recommends --no-install-suggests -q -y \
    apache2 apache2-doc  apache2-utils libexpat1 ssl-cert libapache2-mod-php7.2 php7.2 \
    php7.2-common php7.2-curl php7.2-dev php7.2-gd php-pear php-imagick  php7.2-mysql  php7.2-xsl wget 


RUN sed -i -e "s/upload_max_filesize\s*=\s*2M/upload_max_filesize = 90M/g" ${phpconfile} && \
	sed -i -e "s/post_max_size\s*=\s*8M/post_max_size = 100M/g" ${phpconfile} && \
	sed -i -e "s/memory_limit\s*=\s*128M/memory_limit = 196M/g" ${phpconfile}

RUN cd /var/www/html/; rm ./index.html && \
    wget https://files.phpmyadmin.net/phpMyAdmin/4.9.4/phpMyAdmin-4.9.4-english.tar.gz --no-check-certificate && \
    tar -xvzf phpMyAdmin-4.9.4-english.tar.gz && rm phpMyAdmin-4.9.4-english.tar.gz && \
    mv phpMyAdmin-4.9.4-english phpmyadmin && cd phpmyadmin && mv ./* ../ && cd .. && rm -rf phpmyadmin

COPY config.inc.php /var/www/html/config.inc.php

WORKDIR /var/www/html

EXPOSE 80 

CMD apachectl -D FOREGROUND


 


