(async ()=>{
  try{
    const prisma=require('../src/config/prisma');
    await prisma.$connect();
    const acc=await prisma.accounts.findMany({take:50});
    console.log(JSON.stringify(acc,null,2));
    process.exit(0);
  }catch(e){console.error(e); process.exit(1);} 
})();
