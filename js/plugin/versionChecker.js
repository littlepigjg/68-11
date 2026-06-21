class VersionChecker {
    constructor(hostVersion) {
        this.hostVersion = hostVersion;
    }

    parseVersion(versionStr) {
        const match = versionStr.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);
        if (!match) {
            throw new Error(`无效的版本号格式: ${versionStr}`);
        }
        return {
            major: parseInt(match[1], 10),
            minor: parseInt(match[2], 10),
            patch: parseInt(match[3], 10),
            prerelease: match[4] || null,
            build: match[5] || null
        };
    }

    compareVersions(v1, v2) {
        const ver1 = typeof v1 === 'string' ? this.parseVersion(v1) : v1;
        const ver2 = typeof v2 === 'string' ? this.parseVersion(v2) : v2;

        if (ver1.major !== ver2.major) {
            return ver1.major - ver2.major;
        }
        if (ver1.minor !== ver2.minor) {
            return ver1.minor - ver2.minor;
        }
        if (ver1.patch !== ver2.patch) {
            return ver1.patch - ver2.patch;
        }

        if (ver1.prerelease && !ver2.prerelease) return -1;
        if (!ver1.prerelease && ver2.prerelease) return 1;
        if (ver1.prerelease && ver2.prerelease) {
            return this.comparePrerelease(ver1.prerelease, ver2.prerelease);
        }

        return 0;
    }

    comparePrerelease(pre1, pre2) {
        const parts1 = pre1.split('.');
        const parts2 = pre2.split('.');

        const maxLen = Math.max(parts1.length, parts2.length);
        for (let i = 0; i < maxLen; i++) {
            if (i >= parts1.length) return -1;
            if (i >= parts2.length) return 1;

            const p1 = parts1[i];
            const p2 = parts2[i];

            const isNum1 = /^\d+$/.test(p1);
            const isNum2 = /^\d+$/.test(p2);

            if (isNum1 && isNum2) {
                const diff = parseInt(p1, 10) - parseInt(p2, 10);
                if (diff !== 0) return diff;
            } else if (isNum1 && !isNum2) {
                return -1;
            } else if (!isNum1 && isNum2) {
                return 1;
            } else {
                if (p1 < p2) return -1;
                if (p1 > p2) return 1;
            }
        }
        return 0;
    }

    parseRange(rangeStr) {
        const ranges = [];
        const orParts = rangeStr.split('||').map(s => s.trim());

        for (const orPart of orParts) {
            const andParts = orPart.split(/\s+/).filter(s => s.trim());
            const constraints = [];

            for (const part of andParts) {
                const constraint = this.parseConstraint(part);
                if (constraint) {
                    constraints.push(constraint);
                }
            }

            if (constraints.length > 0) {
                ranges.push(constraints);
            }
        }

        return ranges;
    }

    parseConstraint(constraintStr) {
        const match = constraintStr.match(/^(>=|<=|>|<|=|~|\^)?\s*(\d+\.\d+\.\d+.*)$/);
        if (!match) {
            if (/^\d+\.\d+\.\d+.*$/.test(constraintStr)) {
                return { operator: '=', version: constraintStr };
            }
            return null;
        }

        let operator = match[1] || '=';
        let version = match[2];

        if (operator === '~') {
            const ver = this.parseVersion(version);
            return [
                { operator: '>=', version: `${ver.major}.${ver.minor}.${ver.patch}` },
                { operator: '<', version: `${ver.major}.${ver.minor + 1}.0` }
            ];
        }

        if (operator === '^') {
            const ver = this.parseVersion(version);
            if (ver.major === 0) {
                return [
                    { operator: '>=', version: `${ver.major}.${ver.minor}.${ver.patch}` },
                    { operator: '<', version: `${ver.major}.${ver.minor + 1}.0` }
                ];
            }
            return [
                { operator: '>=', version: `${ver.major}.${ver.minor}.${ver.patch}` },
                { operator: '<', version: `${ver.major + 1}.0.0` }
            ];
        }

        return { operator, version };
    }

    satisfiesConstraint(version, constraint) {
        const { operator, version: constraintVer } = constraint;
        const comparison = this.compareVersions(version, constraintVer);

        switch (operator) {
            case '>': return comparison > 0;
            case '>=': return comparison >= 0;
            case '<': return comparison < 0;
            case '<=': return comparison <= 0;
            case '=': return comparison === 0;
            default: return false;
        }
    }

    satisfies(version, rangeStr) {
        try {
            const ranges = this.parseRange(rangeStr);
            if (ranges.length === 0) return true;

            return ranges.some(constraints => {
                return constraints.every(constraint => {
                    if (Array.isArray(constraint)) {
                        return constraint.every(c => this.satisfiesConstraint(version, c));
                    }
                    return this.satisfiesConstraint(version, constraint);
                });
            });
        } catch (e) {
            console.warn('版本范围解析失败:', e);
            return false;
        }
    }

    checkCompatibility(pluginHostVersion) {
        const result = {
            isCompatible: false,
            hostVersion: this.hostVersion,
            requiredVersion: pluginHostVersion,
            reason: ''
        };

        try {
            result.isCompatible = this.satisfies(this.hostVersion, pluginHostVersion);
            if (!result.isCompatible) {
                result.reason = `插件需要宿主版本 ${pluginHostVersion}，当前版本为 ${this.hostVersion}`;
            }
        } catch (e) {
            result.reason = `版本检查失败: ${e.message}`;
        }

        return result;
    }

    static getInstance(hostVersion = '1.0.0') {
        if (!VersionChecker._instance) {
            VersionChecker._instance = new VersionChecker(hostVersion);
        }
        return VersionChecker._instance;
    }
}

if (typeof window !== 'undefined') {
    window.VersionChecker = VersionChecker;
}
