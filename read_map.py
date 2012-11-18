import Image
im = Image.open("poland.png")
rows = 40
cols = 40
#print dir(im)
width, height = im.size
colWidth = width/cols
colHeight = height/rows
#print colWidth
#print colHeight
for row in range(rows):
  for col in range(cols):
    #pixels = [im.getpixel((x, y)) for x in range(col*colWidth,(col+1)*colWidth)
        #for y in range(row*colHeight, (row+1)*colHeight)]
    pixel = im.getpixel((col*colWidth + colWidth/2, row*colHeight+colHeight/2))
    if pixel == (255, 255, 255, 255):
      #print "col: " + str(col) + "\trow: " + str(row)
      print str(col + row * cols) + ", "
    #print sum(pixels)

