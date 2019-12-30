TERMINAL='application "Terminal"'
CURRENT_TAB='selected tab of the front window'

new_tab () {
  osascript -e "tell ${TERMINAL} to activate"
  osascript -e 'tell application "System Events" to tell process "Terminal" to keystroke "t" using command down'
}
clear_terminal () {
  osascript -e 'tell application "System Events" to tell process "Terminal" to keystroke "k" using command down'
}
run_in_current_tab () {
  osascript -e "tell ${TERMINAL} to do script \"$1\" in ${CURRENT_TAB}"
}
run_with_title () {
  run_in_current_tab 'echo -n -e \"\\033]0;'"$1"'\\007\" && '"$2"
}

# Because meteor needs so much watching o_o
# echo "Asking password to increase max file limit (Meteor needs this)"
# sudo launchctl limit maxfiles 1000000 1000000

# new_tab
# run_with_title "BABEL WATCH" "lerna run watch"

sleep 2
clear_terminal

new_tab
run_in_current_tab "cd ${PWD}/loom"
run_with_title "LOOM" "npm start"

sleep 2
clear_terminal

new_tab
run_in_current_tab "cd ${PWD}/Bundler"
run_in_current_tab "export MONGO_URL=mongodb://localhost:32768"
run_with_title "BUNDLER" "npm start"

sleep 2
clear_terminal

new_tab
run_in_current_tab "cd ${PWD}"
run_in_current_tab "export MONGO_URL=mongodb://localhost:32768"
run_with_title "MC SERVER" "npm run minecraft-server"

sleep 2
clear_terminal

new_tab
run_in_current_tab "cd ${PWD}/spigot-example/plugins/Unchained"
run_with_title "JS WATCH" "npm run watch"

sleep 2
clear_terminal

new_tab
run_in_current_tab "cd ${PWD}/spigot-example/plugins/dev_plugin"
run_with_title "DEV WATCH" "npm run watch"
