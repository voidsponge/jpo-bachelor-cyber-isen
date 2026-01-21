#!/bin/sh
python3 flag-gen.py
php -S 0.0.0.0:3378 -t /var/www/html
exit
