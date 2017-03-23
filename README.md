# WordPress-GEOjson
GEOjson utility library for WordPress

[Voir la documentation en français ici](https://github.com/Celyan-SAS/WordPress-GEOjson/wiki)

Compatible with Advanced Custom Fields: uses ACF's google-map type fields to specify geographic coordinates (latitude, longitude) for every post of a given post type.

Can display maps using 3 different frameworks:
- Leaflet
- Openlayers
- Google Maps

Can use Open Street Map (OSM) open-source data, or Google Maps.

_This documentation will be completed progressively_

## Insert maps using Shortcodes Ultimate

Although this plugin can be used without Shortcodes Ultimate, complex map shortcode generation will be much simpler using Shortcodes Ultimate's in-editor shortcode generation interface.

Instructions:
- Install the [Shortcodes Ultimate WordPress plugin] (it can be install with WP's automatic plugin installation procedure inside the admin panel)
- Use the `[Insert shortcode]` button above the post editor to add a map shortcode.

Shortcodes can also be edited manually as specified hereunder.

## The most simple map shortcode

`[su_wpgeojson_map]`

----------------------
# En français

_Cette documentation sera complétée progressivement_

## Utiliser Shortcodes Ultimate pour créer les cartes

On peut utiliser l'extension [Shortcodes Ultimate](https://fr.wordpress.org/plugins/shortcodes-ultimate/) pour configurer simplement les shortcodes de cartes géographiques.

On peut également saisir les shortcodes manuellement comme décrit ci-dessous, Shortcodes Ultimate n'est donc pas indispensable au bon fonctionnement de ce plugin.

## Le shortcode de carte le plus simple

Pour les exemples les plus simples le shortcode peut être assez court, par exemple pour afficher tous les points correspondant à des articles géolocalisés :

`[su_wpgeojson_map]`

Ce shortcode affichera une carte avec des marqueurs de points si un champ ACF google_map a été ajouté sur les articles.

Si les type de posts à géolocaliser ne sont pas des articles mais un CPT, utiliser l'attribut post_type. Exemple :

`[su_wpgeojson_map post_type="villes"]`

## Shortcodes de cartes dans les templates

On peut utiliser la fonction `do_shortcode()` de WordPress pour insérer des cartes dans les templates de thème.

Ceci permet de paramétrer dynamiquement cetains attributs en fonction du contexte, comme dans cet exemple :

~~~
<?php
    $selection = 'all';
    if( !empty( $_GET['selection'] ) && preg_match( '/^marque_(\d+)$/', $_GET['selection'], $matches ) )
        $selection='relation:marques_distribuees:' . $matches[1];
    echo do_shortcode( '[wpgeojson_map map_type="google-maps" post_type="vendeur" selection="' . $selection . '"]' );
?>
~~~

## Fichiers de données GeoJSON

On peut aussi charger des données géographiques déjà codées dans un fichier en GeoJSON. Exemple pour la liste des bureaux de vote:

`[su_wpgeojson_map file="https://94.citoyens.com/media/geojson/bureaux-primaire-droite-centre.geo.json" height="450" popup_fields="num_bureau,adresse,salle,code_postal,ville"]`

...ici on a un paramètre qui indique quels champs du fichier GeoJSON doivent s'afficher quand on clique sur les épingles.

## Configuration des données à afficher dans les fenêtres pop-up

Exemple assez complexe :

`[su_wpgeojson_map file="https://94.citoyens.com/media/geojson/resultats-primaires-droite-tour1-94.geo.json" height="450" popup_fields="res.Ville,res.Exprimés,res.N. Sarkozy%res.Exprimés,res.F. Fillon%res.Exprimés,res.N. Kosciusko-Morizet%res.Exprimés,res.A. Juppé%res.Exprimés,res.J.-F. Copé%res.Exprimés,res.B. Le Maire%res.Exprimés,res.J.-F. Poisson%res.Exprimés" field_names="yes" gray_if_no="res.Exprimés"]`

On a des paramètres du shortcode qui indiquent quels champs afficher en pop-up, sur quels champs faire des pourcentage, etc. Ca commence à se compliquer ! :)

## Aller encore plus loin

On peut mixer une carte faite avec le shortcode, avec des bibliothèques de traitement de données géographiques en JS, 
comme turf.js ou charger plusieurs couches de données sur la même carte 
(par exemple une base de données des tronçons de rues superposée à la base des cantons et aux bureaux de votes,...), 
ou pour faire des traitements spécifiques (détection de périmètres,...)  - 
dans ce cas on rajoute des scripts JS dans le template après le shortcode -- réservé aux développeurs!

## Compatibilité

Le plugin supporte actuellement les cartes Google-Maps (en tout cas pour les fonctions les plus simples 
comme afficher des points), et aussi (surtout!) les cartes open-source Openstreetmap avec la bibliothèque open-source 
Leaflet qui facilite la manipulation des objets géographiques en JavaScript.

## Créer des jeux de données géographiques encodées en GeoJSON

Voir les outils GDAL/OGR:

- ogr2ogr
- ogrinfo
