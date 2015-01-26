# gitcollab
Generates and visualizes collaboration statistics for git repos.
By: Will Riley

you will need python's pip utility already installed

from terminal run: 
./install.sh

then, to download and convert a git repo (like the Riot repo) to a json log, run:

getdata.sh https://github.com/muut/riotjs.git

then edit your index.html so that it has the correct repo names in the variable called repoNames.  Finally, add any known email aliases for the repos (like if the same person has two email addresses).

then run:

./start.sh


Advanced

if you want your changes to be dynamically updated, open a seperate tab, and run:

./watchit.sh

if you want to update your changes just once, run:

./bundleit.sh
