# export query='(Balaclava OR "Box hill" OR Camberwell OR Brunswick OR Malvern OR Docklands OR Flinders OR Footscray OR Moreland OR "Port Melbourne" OR "St Kilda" OR Toorak OR Lygon OR Brunswick OR Caulfield OR "La Trobe" OR Collingwood OR Southbank) (myki OR tram OR trams) lang:en -is:retweet'

python3 search.py -q '(Balaclava OR "Box hill" OR Camberwell OR Brunswick OR Malvern OR Docklands OR Flinders OR Footscray OR Moreland OR "Port Melbourne" OR "St Kilda" OR Toorak OR Lygon OR Brunswick OR Caulfield OR "La Trobe" OR Collingwood OR Southbank) (myki OR tram OR trams OR PTV) lang:en -is:retweet' -d melb_db
