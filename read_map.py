# Prints empty (colored in white) cell indices

import Image
im = Image.open("img/poland.png")
rows = 40
cols = 40
width, height = im.size
colWidth = width/cols
colHeight = height/rows
for row in range(rows):
  for col in range(cols):
    pixel = im.getpixel((col*colWidth + colWidth/2, row*colHeight+colHeight/2))
    if pixel == (255, 255, 255, 255):
      print str(col + row * cols) + ", "
