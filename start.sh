#!/bin/bash
./bundleit.sh
ws -p 8087 &
open http://localhost:8087