# gitcollab
Generates and visualizes collaboration statistics for git repos.
By: Will Riley

you will pip already installed

from terminal run: 
./install.sh

then, to download and convert a git repo (like the AngularJS repo) to a json log, run:

clonegit2json.sh https://github.com/angular/angular.js.git

then edit your index.html so that it has the correct repo names in the variable called repoNames.  Finally, add any known email aliases for the repos (like if the same person has two email addresses).

then run:

./watchit.sh

next, to start the local webserver, run:

ws

finally, open your browser to whatever the server starts running, like:

http://localhost:8000

