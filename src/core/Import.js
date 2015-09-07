module.exports = function(fnResolve){
	"use strict";

	function Import(){
		this._mPathTree = {};
		this._mRequiredModules = {};
		this._mRequiredPaths = {};

		this._oFS = require('fs');
		this._base = process.cwd();
	};

	Import.prototype.mapModulePath = function(sAlias,sPhysicalPath){
		var aAliasParts = sAlias.split('.');
		this._setRegisterFromAlias(this._mPathTree,aAliasParts,sAlias,sPhysicalPath);
		return this;
	};

	Import.prototype._setRegisterFromAlias = function(oNavigator,aAliasParts,sAlias,sPhysicalPath){
		var sPart = aAliasParts.splice(0,1)[0];
		if (sPart){
			if (!oNavigator.hasOwnProperty(sPart)){
				oNavigator = oNavigator[sPart] = {};
			}else {
				oNavigator = oNavigator[sPart];
			}
			//Recursion can cause Stack-overflow errors. JS don't support tail calculation
			this._setRegisterFromAlias(oNavigator,aAliasParts,sAlias,sPhysicalPath);
		}else {
			oNavigator.path = sPhysicalPath
			oNavigator.alias = sAlias;
		};
	};

	Import.prototype._getRegisterFromAlias = function(oNavigator,aAliasParts){
		var sPart = aAliasParts.splice(0,1)[0];
		if (sPart && oNavigator.hasOwnProperty(sPart)){
			oNavigator = oNavigator[sPart];
			return this._getRegisterFromAlias(oNavigator,aAliasParts);
		}else if (oNavigator.hasOwnProperty('alias')){
			return oNavigator;
		}else {
			throw new Error('Import.prototype._getRegisterFromAlias: Attribute "path" not found.' + sAliasParts.join('.'));
		}
	};
	Import.prototype._assembleRequirePath = function(sRequiredAlias,bAddJSSuffix){
		var oRegister = this._getRegisterFromAlias(this._mPathTree,sRequiredAlias.split('.'));

		var sAliasReplaced = sRequiredAlias.replace(oRegister.alias,oRegister.path);

		var sAssembledRequirePath = this._prepareRequirePath(sAliasReplaced,bAddJSSuffix);

		return sAssembledRequirePath;
	};

	Import.prototype._prepareRequirePath = function(sPath,bAddJSSuffix){
		var sDotsReplaced = sPath.replace(/\./gi,'/');

		var sWithJSSuffix = bAddJSSuffix ? sDotsReplaced.concat('.js') : sDotsReplaced;
		var sWithBasePrefix = this._base + sWithJSSuffix;
		return sWithBasePrefix
	}

	Import.prototype.module = function(sRequiredAlias){
		return new Promise(injectjs.core.Utils.proxy(function(fnResolve,fnReject){
			this._require(
				this._assembleRequirePath(sRequiredAlias,true),
				fnResolve
			);
		},this));
	};



	Import.prototype._resolveFileNameAndContent = function(sFileName,fnResolvePromise){
		return function(fnRequiredContent){
			fnResolvePromise({sFileName:sFileName,vFileContent: fnRequiredContent});
		}
	},

	Import.prototype._require = function(sRequirePath,fnResolve){
		return require(sRequirePath)(fnResolve);
	};

	Import.prototype._readdirSync = function(sRequirePath){
		return this._oFS.readdirSync(sRequirePath);
	};

	var oImport = new Import();
	fnResolve && fnResolve(oImport);
	return oImport;
}
