#!/bin/bash

# 清理静态托管中的旧文件脚本
echo "🧹 开始清理静态托管中的旧文件..."

ENV_ID="cloud1-7g7oatv381500c81"

# 删除根目录下的旧文件（非lexicon-webapp目录）
echo "删除根目录旧CSS文件..."
tcb hosting delete assets/index-BYnf40st.css -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete assets/index-C2Ql6SKH.css -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete assets/index-DdD3kXAo.css -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete assets/index-DkspIGYO.css -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete assets/index-XoMq2jY-.css -e $ENV_ID --force || echo "文件可能不存在"

echo "删除根目录旧JS文件..."
tcb hosting delete assets/index-DWF6uIw5.js -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete assets/index-DzvIVrfR.js -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete assets/router-hCrjPs1S.js -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete assets/ui-8oxqPNCx.js -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete assets/vendor-DoC2WAmd.js -e $ENV_ID --force || echo "文件可能不存在"

echo "删除根目录下的旧JS文件..."
for file in js/AuthPage-BAKbwjHQ.js js/AuthPage-ChAskvIF.js js/DataPreview-BXEqJUeS.js js/DataPreview-CygMpn7j.js js/FileUploadZone-B4gJcyk3.js js/FileUploadZone-DkPhy4qQ.js js/FormatGuide-DB76KqRP.js js/FormatGuide-DstXPush.js js/HomePage-BQDItrQR.js js/HomePage-Dk09LT4J.js js/NotFoundPage-4cg-zTAG.js js/NotFoundPage-DuRlflE2.js js/ProfilePage-BLtOGck0.js js/ProfilePage-ThR8Qq7P.js js/SettingsPage-B0fAu9SQ.js js/SettingsPage-qQ9AwjOI.js js/StatsPage-B65soJoL.js js/StatsPage-DC8pQHBI.js js/StudyCard-BJ46Nmyt.js js/StudyCard-Uf4Os0HT.js js/StudyPage--Sp9R5kT.js js/StudyPage-BhRv6sIZ.js js/StudyProgress-B7pDToAX.js js/StudyProgress-CK7fp0pp.js js/StudyStats-4U2GrRSn.js js/StudyStats-Dt2QJrze.js js/UploadPage-BsrUWUM0.js js/UploadPage-DPczxmiZ.js js/UploadProgress-CwyC9d5X.js js/UploadProgress-Ts4xG4tO.js js/WordbooksPage-CaKTse2m.js js/WordbooksPage-KB1Su3VW.js; do
    echo "删除 $file"
    tcb hosting delete "$file" -e $ENV_ID --force || echo "文件 $file 可能不存在"
done

echo "删除其他旧文件..."
for file in js/arrow-left-BAgKjacT.js js/arrow-left-C4CN29wT.js js/button-B-TTTira.js js/button-BDRzq8tc.js js/card-BghXjpAJ.js js/card-CRtxm-Y5.js js/circle-check-AV1XsPNQ.js js/circle-check-BAv0VlZg.js js/circle-check-big-3HoJ9f3d.js js/circle-check-big-CUY4GuIp.js js/cloudbase-B41KkyjZ.js js/cloudbase-CFSRuGxi.js js/eye-DtOOaaXb.js js/eye-a3gybvWc.js js/fileUtils--CNblxEm.js js/fileUtils-BL6lKEv4.js js/index--jW_G-E3.js js/index-AteRH57f.js js/index-BrmyFCIJ.js js/index-CUdruZT-.js js/index-DtC35YFA.js js/pages-VOzF4syg.js js/pages-YyP30VrS.js js/progress-Ctkz33dX.js js/progress-DLUXc-_V.js js/react-vendor-BV46lSiK.js js/react-vendor-DVX0xdhC.js js/services-BBcNUBOL.js js/services-Bq44Gi-L.js js/study-DvcrHqUw.js; do
    echo "删除 $file"
    tcb hosting delete "$file" -e $ENV_ID --force || echo "文件 $file 可能不存在"
done

echo "删除根目录下的index.html和fonts目录..."
tcb hosting delete index.html -e $ENV_ID --force || echo "文件可能不存在"
tcb hosting delete fonts/zpix.ttf -e $ENV_ID --force || echo "文件可能不存在"

echo "删除lexicon-webapp-v2目录..."
tcb hosting delete lexicon-webapp-v2 -e $ENV_ID --force --recursive || echo "目录可能不存在"

echo "✅ 清理完成！保留的文件仅在 /lexicon-webapp 目录下"