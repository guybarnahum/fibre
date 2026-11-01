#!/bin/bash
usage() {
  echo "usage: run-at.sh <when> '<commands>' [logfile]"
  echo "  when: HH:MM (UTC, next occurrence) | reset (00:03 UTC) | +Ns | +Nm | +Nh"
  echo "  runs detached and awake; output goes to the log file"
  exit 2
}
[ $# -lt 2 ] && usage
when=$1
cmd=$2
log=${3:-$PWD/run-at-$(date -u +%Y%m%dT%H%M%S).log}
case $log in /*) ;; *) log=$PWD/$log ;; esac
now=$(date -u +%s)
day=$(( now / 86400 * 86400 ))
case $when in
  reset) target=$(( day + 86400 + 180 )) ;;
  +*s) target=$(( now + ${when:1:${#when}-2} )) ;;
  +*m) target=$(( now + ${when:1:${#when}-2} * 60 )) ;;
  +*h) target=$(( now + ${when:1:${#when}-2} * 3600 )) ;;
  [01][0-9]:[0-5][0-9]|2[0-3]:[0-5][0-9])
    target=$(( day + 10#${when%%:*} * 3600 + 10#${when##*:} * 60 ))
    [ $target -le $now ] && target=$(( target + 86400 )) ;;
  *) usage ;;
esac
utc() { date -u -r "$1" 2>/dev/null || date -u -d "@$1"; }
if [ -z "$RUN_AT_CHILD" ]; then
  awake=""
  command -v caffeinate >/dev/null && awake="caffeinate -is"
  RUN_AT_CHILD=1 RUN_AT_TARGET=$target nohup $awake bash "$0" "$when" "$cmd" "$log" >/dev/null 2>&1 &
  echo "scheduled for $(utc $target) (pid $!)"
  echo "log: $log"
  echo "cancel: kill $!"
  exit 0
fi
target=${RUN_AT_TARGET:-$target}
echo "$(date -u) waiting until $(utc $target) to run: $cmd" > "$log"
wait_s=$(( target - $(date -u +%s) ))
[ $wait_s -gt 0 ] && sleep $wait_s
echo "$(date -u) running in $PWD" >> "$log"
bash -c "$cmd" >> "$log" 2>&1
code=$?
echo "$(date -u) finished with exit code $code" >> "$log"
exit $code
