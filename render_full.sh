#!/usr/bin/env bash
# Pakai:  bash render_full.sh [JUMLAH_PROSES] [SKALA] [LANGKAH]
#   JUMLAH_PROSES : berapa render jalan bersamaan (isi sesuai jumlah inti CPU, contoh 4)
#   SKALA         : 1 = 1080x1920 (kualitas penuh), 0.667 = 720x1280 (lebih cepat)
#   LANGKAH       : 1 = 30 gambar/detik (halus), 2 = 15 gambar/detik (2x lebih cepat)
set -e
N=${1:-2}; RS=${2:-1}; STEP=${3:-1}; TOTAL=1897
mkdir -p frames out
per=$(( (TOTAL + N - 1) / N ))
for i in $(seq 0 $((N-1))); do
  a=$(( i * per )); b=$(( a + per - 1 )); [ $b -gt $((TOTAL-1)) ] && b=$((TOTAL-1))
  # tiap proses memulai dari frame genap/ganjil yang pas dengan LANGKAH
  [ $STEP -eq 2 ] && [ $((a % 2)) -eq 1 ] && a=$((a+1))
  RESUME=1 HASH="?rs=$RS" node render.mjs frames "$a-$b" $STEP 0.95 > "render_$i.log" 2>&1 &
done
wait
echo "Render selesai. Sekarang menyatukan jadi video..."
FR=$((30 / STEP))
ffmpeg -v error -y -i mix_raw.wav -af "loudnorm=I=-14:TP=-1.5:LRA=7" -ar 48000 -ac 2 mix.wav
ffmpeg -v error -y -framerate $FR -pattern_type glob -i "frames/f*.jpg" -i mix.wav -map 0:v:0 -map 1:a:0 \
  -vf "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 17 -c:a aac -b:a 192k -shortest -movflags +faststart out/The-Emu-War.mp4
echo "Selesai: out/The-Emu-War.mp4"
