#!/bin/bash

watchify -r lodash -r jquery-browserify -r mathjs -r ./gitcollab.js:gitcollab -o bundle.js -v