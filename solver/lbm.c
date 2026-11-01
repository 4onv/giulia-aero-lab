/* D3Q19 BGK lattice Boltzmann research solver. SI scaling is handled by the UI.
   Reduced Reynolds number, halfway no-slip bounce-back, slip ground,
   equilibrium farfield and zero-gradient outlet. Not validated vehicle CFD. */
#define MAXN (136*48*72)
#define Q 19
static float bankA[MAXN*Q],bankB[MAXN*Q],result[MAXN*4];
static unsigned char solid[MAXN];
static float *src=bankA,*dst=bankB;
static int nx,ny,nz,n,steps,failed;
static float ux0,uz0,tau;
static int ramp=0;
void set_ramp(int value){ramp=value;}
static const int cx[Q]={0,1,-1,0,0,0,0,1,-1,1,-1,1,-1,1,-1,0,0,0,0};
static const int cy[Q]={0,0,0,1,-1,0,0,1,-1,-1,1,0,0,0,0,1,-1,1,-1};
static const int cz[Q]={0,0,0,0,0,1,-1,0,0,0,0,1,-1,-1,1,1,-1,-1,1};
static const int opp[Q]={0,2,1,4,3,6,5,8,7,10,9,12,11,14,13,16,15,18,17};
static const int reflectY[Q]={0,1,2,4,3,5,6,9,10,7,8,11,12,13,14,18,17,16,15};
static const float w[Q]={1.f/3,1.f/18,1.f/18,1.f/18,1.f/18,1.f/18,1.f/18,1.f/36,1.f/36,1.f/36,1.f/36,1.f/36,1.f/36,1.f/36,1.f/36,1.f/36,1.f/36,1.f/36,1.f/36};
static float eq(int i,float rho,float u,float v,float z){float dot=cx[i]*u+cy[i]*v+cz[i]*z;return w[i]*rho*(1+3*dot+4.5f*dot*dot-1.5f*(u*u+v*v+z*z));}
unsigned char* mask_ptr(void){return solid;}
float* output_ptr(void){return result;}
int step_count(void){return steps;}
int init(int x,int y,int z,float u,float lateral,float relaxation){
 if(x<4||y<4||z<4||x*y*z>MAXN||relaxation<=.5f||relaxation>2)return 0;
 nx=x;ny=y;nz=z;n=x*y*z;ux0=u;uz0=lateral;tau=relaxation;steps=failed=0;src=bankA;dst=bankB;
 for(int p=0;p<n;p++)for(int i=0;i<Q;i++)src[p*Q+i]=eq(i,1,(solid[p]||ramp)?0:u,0,(solid[p]||ramp)?0:lateral);
 return 1;
}
int advance(int count){
 if(failed)return -1;
 for(int t=0;t<count;t++){
  float factor=(!ramp||steps>=400)?1.f:(steps+1)/400.f;
  float windX=ux0*factor,windZ=uz0*factor;
  for(int z=0;z<nz;z++)for(int y=0;y<ny;y++)for(int x=0;x<nx;x++){
   int p=x+nx*(y+ny*z),base=p*Q;
   if(solid[p]){for(int i=0;i<Q;i++)dst[base+i]=src[base+i];continue;}
   if(x==0||y==ny-1||z==0||z==nz-1){for(int i=0;i<Q;i++)dst[base+i]=eq(i,1,windX,0,windZ);continue;}
   if(x==nx-1){for(int i=0;i<Q;i++)dst[base+i]=src[(p-1)*Q+i];continue;}
   float f[Q],rho=0,u=0,v=0,uz=0;
   for(int i=0;i<Q;i++){
    int ax=x-cx[i],ay=y-cy[i],az=z-cz[i];
    if(ay<0){int q=ax+nx*(ny*az);f[i]=solid[q]?src[base+opp[i]]:src[q*Q+reflectY[i]];}
    else {int q=ax+nx*(ay+ny*az);f[i]=solid[q]?src[base+opp[i]]:src[q*Q+i];}
    rho+=f[i];u+=cx[i]*f[i];v+=cy[i]*f[i];uz+=cz[i]*f[i];
   }
   if(!(rho>.8f&&rho<1.2f)){result[0]=p;result[1]=rho;failed=1;return -1;}
   u/=rho;v/=rho;uz/=rho;
   // Static Smagorinsky eddy viscosity from the non-equilibrium stress.
   float equilibrium[Q],xx=0,yy=0,zz=0,xy=0,xz=0,yz=0;
   for(int i=0;i<Q;i++){
    equilibrium[i]=eq(i,rho,u,v,uz);float d=f[i]-equilibrium[i];
    xx+=d*cx[i]*cx[i];yy+=d*cy[i]*cy[i];zz+=d*cz[i]*cz[i];
    xy+=d*cx[i]*cy[i];xz+=d*cx[i]*cz[i];yz+=d*cy[i]*cz[i];
   }
   float norm=__builtin_sqrtf(xx*xx+yy*yy+zz*zz+2*(xy*xy+xz*xz+yz*yz));
   float effective=.5f*(tau+__builtin_sqrtf(tau*tau+18*1.41421356237f*.16f*.16f*norm/rho));
   for(int i=0;i<Q;i++)dst[base+i]=f[i]-(f[i]-equilibrium[i])/effective;
  }
  float *swap=src;src=dst;dst=swap;steps++;
 }
 return steps;
}
int snapshot(void){
 if(failed)return 0;float speed=__builtin_sqrtf(ux0*ux0+uz0*uz0);
 for(int p=0;p<n;p++){
  if(solid[p]){for(int a=0;a<4;a++)result[4*p+a]=0;continue;}
  float rho=0,u=0,v=0,z=0;for(int i=0;i<Q;i++){float f=src[p*Q+i];rho+=f;u+=cx[i]*f;v+=cy[i]*f;z+=cz[i]*f;}
  result[4*p]=u/(rho*speed);result[4*p+1]=v/(rho*speed);result[4*p+2]=z/(rho*speed);
  result[4*p+3]=2*(rho-1)/(3*speed*speed);
 }return n;
}


