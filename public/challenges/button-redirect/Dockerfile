FROM alpine:latest

RUN apk update && apk add --no-cache \
    php \
    php-fpm \
    php-cli \
    php-openssl \
    php-mbstring \
    php-json \
    php-phar \
    php-session \
    bash \
    curl

WORKDIR /var/www/html

COPY index.php .
COPY my-suuuuuuuuuuper-flag-i-dont-know.php .

RUN apk update && apk add --no-cache python3 py3-pip

WORKDIR /FLAG-GEN

COPY flag-gen.py .
COPY FG_ADJ .
COPY FG_NAME .
COPY setup.sh .

RUN chmod +x /FLAG-GEN/setup.sh

CMD ["/FLAG-GEN/setup.sh"]
