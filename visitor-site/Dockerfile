# Use the official WordPress image as the base image
FROM wordpress:latest

# Install necessary dependencies (curl, unzip, git, Composer, WP-CLI)
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    git \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x wp-cli.phar \
    && mv wp-cli.phar /usr/local/bin/wp \
    && apt-get clean


# Increase file upload limits (optional)
RUN echo "upload_max_filesize = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

    
# Set the working directory to the WordPress root directory
WORKDIR /var/www/html

# Remove any existing wp-content and create a new directory
#RUN rm -rf /var/www/html/wp-content/* || true
#RUN mkdir -p /var/www/html/wp-content

# Set proper permissions for WordPress files
#RUN chown -R www-data:www-data /var/www/html && chmod -R 777 /var/www/html

# Copy the composer.json file into the container
#COPY composer.json /var/www/html/


# List the files to ensure composer.json is copied correctly
RUN ls -la /var/www/html/

# Run Composer to install WordPress and plugins
#RUN composer install --no-dev --no-scripts --verbose

# Copy the custom entrypoint script
COPY entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh
# Expose the default WordPress port
EXPOSE 80

# Set the custom entrypoint and default command
ENTRYPOINT ["/entrypoint.sh"]
#RUN chown -R www-data:www-data /var/www/html && chmod -R 777 /var/www/html


CMD ["apache2-foreground"]
