{
  "targets": [
    {
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
		"/assets/c/"
      ],
      "target_name": "addon",
      "sources": [ "main.cpp" ]
    }
  ]
}