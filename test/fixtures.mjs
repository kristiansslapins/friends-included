export const sales=[
  ['S01','richard','Olivia Rose','One proud uncle and an emotional grandmother','A','1000',[50,30,20]],
  ['S02','anastasia','Daniel King','University friends, dancing, and the stripping performance','B','2000',[0,50,50]],
  ['S03','jean','Emma Stonebridge','Premium relatives, including an uncle presented as a surgeon','A','1500',[40,40,20]],
  ['S04','richard','Lucas Green','Small group of loud university friends','B','800',[25,25,50]],
  ['S05','richard','Mia Brooks','Extra guests and an embarrassing speech','B','600',[100,0,0]]
].map(([ref,actor,customer,description,project,amount,split])=>({actor,kind:'sale',ref,customer,description,project,amount,split}));
export const expenses=[
  ['E01','Rented suit and fake pearl necklace for the relatives','Materials','120','A'],
  ['E02','Taxi for the grandmother; Kevin selected the wrong project','Travel','80','B'],
  ['E03','Monthly company website subscription','Other','100','Company overhead'],
  ['E04','Replacement costumes after an enthusiastic dance performance','Materials','250','B'],
  ['E05','Minibus for university friends; Kevin selected the wrong project again','Travel','90','A'],
  ['E06','Company telephone subscription','Other','60','Company overhead'],
  ['E07','Emergency replacement clothing; project allocation still needs checking','Materials','140','A']
].map(([ref,description,category,amount,allocation])=>({kind:'expense',ref,description,category,amount,allocation}));
