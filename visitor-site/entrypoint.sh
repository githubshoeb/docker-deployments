#!/bin/bash
echo "URL: $URL"
echo "TITLE: $TITLE"
echo "ADMIN_USER: $ADMIN_USER"
echo "ADMIN_PASSWORD: $ADMIN_PASSWORD"
echo "ADMIN_EMAIL: $ADMIN_EMAIL"
echo "ASTRA_LICENSE_KEY: $ASTRA_LICENSE_KEY"
echo "Setting file permissions..."

if ! wp core is-installed --allow-root; then
    echo "WordPress is not installed. Downloading WordPress..."
    wp core download --allow-root

    echo "Creating wp-config.php..."
    wp config create --dbname="$DB_NAME" --dbuser="$DB_USER" --dbpass="$DB_PASS" --dbhost="$DB_HOST" --allow-root

    if [ ! -f wp-config.php ]; then
        echo "wp-config.php was not created. Check for errors."
        exit 1
    fi

    echo "Installing WordPress..."
    wp core install --url="$URL" --title="$TITLE" --admin_user="$ADMIN_USER" --admin_password="$ADMIN_PASSWORD" --admin_email="$ADMIN_EMAIL" --allow-root
else
    echo "WordPress is already installed."
fi


wp config set FS_METHOD direct --type=constant --allow-root
mkdir -p /var/www/html/wp-content/uploads/astra-sites/
mkdir -p /var/www/html/wp-content/uploads/ai-builder/
echo "Setting file permissions..."
chown -R www-data:www-data /var/www/html/wp-content/uploads
chmod -R 755 /var/www/html/wp-content/uploads/astra-sites/
chmod -R 755 /var/www/html/wp-content/uploads/ai-builder/


composer config --no-plugins allow-plugins.composer/installers true

# Activate all installed plugins

#COMPOSER_PROCESS_TIMEOUT=2000 composer install
COMPOSER_AUTH='{"http-basic":{"gitlabnew.intellasphere.com":{"username":"'"$GITLAB_USERNAME"'","password":"'"$GITLAB_TOKEN"'"}}}' COMPOSER_PROCESS_TIMEOUT=2000 composer install

wp plugin activate --all --allow-root

echo "impoting the template"

STARTER_TEMPLATE_FLAG="/var/www/html/wp-content/uploads/.starter_template_imported"

if [ -f "$STARTER_TEMPLATE_FLAG" ]; then
    echo "Starter template already imported. Skipping..."
else
    if [ -n "$STARTER_TEMPLATE" ]; then
        echo "Importing starter template..."
        wp theme activate astra-child --allow-root
        wp option update permalink_structure '/%postname%/' --allow-root
        wp rewrite flush --allow-root
        wp beaver register --license="$BEAVER_LICENSE_KEY" --allow-root
        wp option update default_role administrator --allow-root
        wp brainstormforce license activate astra-pro-sites "$ASTRA_LICENSE_KEY" --allow-root
        wp starter-templates import "$STARTER_TEMPLATE" --reset --yes --allow-root
        echo "Starter template import completed." > "$STARTER_TEMPLATE_FLAG"
        
    else
        echo "STARTER_TEMPLATE variable is not set. Skipping import."
    fi
fi

wp option update mo_oauth_apps_list --allow-root --format=json '{
  "azureb2c": {
    "ssoprotocol": "openidconnect",
    "apptype": "openidconnect",
    "clientid": "'$AZUREB2C_CLIENT_ID'",
    "clientsecret": "'$AZUREB2C_CLIENT_SECRET'",
    "redirecturi": "'$AZUREB2C_REDIRECTURI'",
    "send_headers": "0",
    "send_body": "0",
    "send_state": 1,
    "show_on_login_page": 1,
    "allow_admin_sso": 1,
    "appId": "azureb2c",
    "scope": "'$AZUREB2C_SCOPE'",
    "authorizeurl": "'$AZUREB2C_AUTHORIZEURL'",
    "accesstokenurl": "'$AZUREB2C_ACCESSTOKENURL'",
    "resourceownerdetailsurl": "",
    "username_attr" : "given_name",
    "email_attr" : "emails.0"
  }
}'


wp option update is_app_settings_url "$APP_SETTINGS_URL" --allow-root
wp option update is_api_settings_url "$API_SETTINGS_URL" --allow-root
wp option update is_syc_settings_url "$SYC_SETTINGS_URL" --allow-root
wp option update login_button_url_azureb2c "$APP_NAME" --allow-root
wp option update permalink_structure '' --allow-root
wp rewrite flush --allow-root

chmod -R 777 /var/www/html/wp-content
wp rewrite flush --allow-root
# Start Apache server
exec apache2-foreground
