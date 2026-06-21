window.PREZI_MORPH_SLIDES = window.PREZI_MORPH_SLIDES || {};
window.PREZI_MORPH_SLIDES[12] = {
  "index": 13,
  "objects": [
    {
      "key": "!!web_scene_image",
      "name": "!!web_scene_image",
      "descr": "SQL request illustration",
      "src": "assets/res_sql.png",
      "x": 0,
      "y": 0,
      "w": 1,
      "h": 1,
      "z": 1
    },
    {
      "key": "!!web_overlay",
      "kind": "sql",
      "name": "sql",
      "x": 0,
      "y": 0,
      "w": 1,
      "h": 1,
      "z": 2,
      "query": "SELECT title, url, score\nFROM posts\nWHERE subreddit = 'technology'\nORDER BY score DESC;",
      "label": "SQL"
    }
  ]
};
