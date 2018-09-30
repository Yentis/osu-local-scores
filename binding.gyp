{
  "targets": [
    {
      "include_dirs": [
        "<!(node -e \"require('nan')\")",
		"assets/c/"
      ],
      "target_name": "ppCalculator",
      "sources": [ "main.cpp" ]
    }
  ]
}