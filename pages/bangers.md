---
title: "Bangers"
description: "\"All art, aspires to music.\""
use_description_as_title: true
layout: bangers
permalink: /bangers/
menu:
  main:
    weight: 4
---

{% assign songs = site.bangers | sort: 'sort_artist' %}
<ol class="bangers-list">
{% for song in songs %}
  <li>
    <a href="{{ song.url }}" class="banger-link">{{ song.title }}</a> — {{ song.artist }}
    {% if song.blurb and song.blurb != "" %}<p class="banger-blurb">{{ song.blurb }}</p>{% endif %}
  </li>
{% endfor %}
</ol>
