build:
	npm run build
	git add -A
	git commit -am 'update'
	npm version patch
	npm publish .
	git push origin master
link:
	npm run build
	npm link
