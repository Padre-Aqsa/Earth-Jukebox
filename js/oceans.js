// Ocean basins for the sea-surface-temperature panel. Sea-surface temperature has colour only over water, so it is reported per OCEAN, not per country.
// Approximate boundaries (straight lines through land where the real boundary runs over land, as in IHO-style ocean limits):
//  Southern: south of 60° S.  Arctic: north of 66.5° N.  Indian: east of 20° E (Cape Agulhas) and Red Sea / Persian Gulf, west of the line
//  Malay Peninsula - Sunda - Lombok - Torres Strait - 147° E (south of Tasmania).  Atlantic: Mediterranean, Black Sea, Baltic, Caribbean, Gulf of Mexico,
//  Hudson Bay, west edge Cape Horn (67° W) and the Central American isthmus.  Pacific: everything else.
const Oceans=(()=>{
  const NAMES=['Pacific Ocean','Atlantic Ocean','Indian Ocean','Southern Ocean','Arctic Ocean'];
  const INDIAN=[[20,-60],[20,5],[32,30.6],[96,30.6],[98.5,10.5],[100.5,6],[103.8,1.3],[106,-6],[115.8,-8.8],[125,-10],[141,-11],[147,-39],[147,-60]];
  const ATLANTIC=[[-67.3,-60],[-67.3,-56],[-68.5,-52.5],[-70,-48],[-70,0],[-77.5,7.5],[-80,8.7],[-83,9.6],[-85.5,11],[-88,13.5],[-92,14.8],[-94.5,16.5],[-97.5,18],[-100,20],[-101,25],[-100,30],
    [-100,70],[42,70],[42,30.6],[32,30.6],[20,5],[20,-60]];
  const inside=(poly,x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
  // 0 Pacific, 1 Atlantic, 2 Indian, 3 Southern, 4 Arctic
  function classify(lon,lat){
    if(lat<-60)return 3;if(lat>=66.5)return 4;
    lon=((lon+180)%360+360)%360-180;
    if(inside(INDIAN,lon,lat))return 2;if(inside(ATLANTIC,lon,lat))return 1;return 0;}
  const grid=new Uint8Array(360*180);
  for(let y=0;y<180;y++)for(let x=0;x<360;x++)grid[y*360+x]=classify(x-180+.5,89.5-y);
  const at=(lon,lat)=>{lon=((lon+180)%360+360)%360-180;const x=Math.min(359,Math.max(0,Math.floor(lon+180))),y=Math.min(179,Math.max(0,Math.floor(90-lat)));return grid[y*360+x];};
  return{NAMES,classify,at};
})();
